const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const axios = require("axios");
const cookieParser = require("cookie-parser");
const nodemailer = require("nodemailer");
const twvoucher = require("@fortune-inc/tw-voucher");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
require("dotenv").config();

const upload = multer({ dest: "uploads/" });
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "https://iphet-store.web.app",
    methods: ["POST", "GET", "DELETE"],
    credentials: true,
  })
);

const saltRounds = parseInt(process.env.SALT_ROUNDS); 
const db = mysql.createConnection({
  host: process.env.DB_HOST || "sql12.freesqldatabase.com",
  user: process.env.DB_USER || "sql12727096",
  password: process.env.DB_PASSWORD || "QGwTusbwM5",
  database: process.env.DB_NAME || "sql12727096",
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to the database:", err);
    process.exit(1);
  }
});

/* Register */

const profilePictures = [
  "/src/assets/images/profile/profile-01.jpg",
  "/src/assets/images/profile/profile-02.jpg",
  "/src/assets/images/profile/profile-03.jpg",
  "/src/assets/images/profile/profile-04.jpg",
  "/src/assets/images/profile/profile-05.jpg",
  "/src/assets/images/profile/profile-06.jpg",
  "/src/assets/images/profile/profile-07.jpg",
  "/src/assets/images/profile/profile-08.jpg",
  "/src/assets/images/profile/profile-10.jpg",
];

app.post("/signup", async (req, res) => {
  let { usernameNew, emailNew, passwordNew, confirmPassword, termsAgreed } = req.body;
  const urole = "User";

  // Convert to lowercase
  const username = usernameNew ? usernameNew.toLowerCase() : '';
  const email = emailNew ? emailNew.toLowerCase() : '';

  try {
    // Validate input
    if (!username || !email || !passwordNew || !confirmPassword || !termsAgreed) {
      return res.status(400).json({
        type: "error",
        message: "โปรดกรอกข้อมูลที่จำเป็นให้ครบและยอมรับเงื่อนไขข้อตกลง",
      });
    }

    if (passwordNew !== confirmPassword) {
      return res.status(400).json({
        type: "error",
        message: "รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        type: "error",
        message: "รูปแบบอีเมลไม่ถูกต้อง",
      });
    }

    // Check if username or email already exists
    const [existingUsers] = await db.promise().query(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [username, email]
    );

    if (existingUsers.length > 0) {
      const existingUser = existingUsers.find(
        (user) => user.username === username || user.email === email
      );
      if (existingUser) {
        if (existingUser.username === username) {
          return res.status(409).json({
            type: "error",
            message: "Username นี้ถูกใช้ไปแล้ว",
          });
        }
        if (existingUser.email === email) {
          return res.status(409).json({
            type: "error",
            message: "Email นี้ถูกใช้ไปแล้ว",
          });
        }
      }
    }

    // Create new user
    const selectedProfile = profilePictures[Math.floor(Math.random() * profilePictures.length)];
    const hashedPassword = await bcrypt.hash(passwordNew, saltRounds);

    await db.promise().query(
      "INSERT INTO users (profile, username, email, password, urole) VALUES (?, ?, ?, ?, ?)",
      [selectedProfile, username, email, hashedPassword, urole]
    );

    // Send Discord notification
    axios.post(process.env.DISCORD_WEBHOOK_SIGNUP, {
      embeds: [
        {
          title: "🎉 ผู้ใช้ใหม่!",
          description: "ยินดีต้อนรับผู้ใช้ใหม่เข้าสู่ระบบของเรา 🎊",
          color: 0x00ff00,
          fields: [
            {
              name: "ข้อมูลผู้สมัคร",
              value: `\`\`\`
Username: ${username}
Email: ${email}
Time: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
\`\`\``,
              inline: false,
            },
          ],
          footer: {
            text: "ระบบการสมัครสมาชิก",
          },
          timestamp: new Date(),
        },
      ],
    }).catch(error => {
      console.error("Error sending Discord notification:", error);
    });

    return res.status(201).json({
      type: "success",
      message: "ลงทะเบียนเสร็จสิ้น",
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      type: "error",
      message: "เกิดข้อผิดพลาดในการสร้างบัญชีผู้ใช้งาน",
    });
  }
});

/* Login */

const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.status(401).send("Access Denied");

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { username: verified.username };
    next();
  } catch (err) {
    res.status(401).send("Invalid or Expired Token");
  }
};

app.get("/protected", authenticateToken, (req, res) => {
  db.query(
    "SELECT * FROM users WHERE username = ?",
    [req.user.username],
    async (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ type: "error", message: "มีข้อผิดพลาดเกิดขึ้น" });
      }
      if (results.length === 0) {
        return res.status(404).json({ type: "error", message: "ไม่พบผู้ใช้" });
      }
      const user = results[0];
      res.status(200).json({ type: "success", message: "success", user });
    }
  );
});


app.post("/signin", async (req, res) => {
  const { username, password, rememberMe } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({
        type: "error", message: "โปรดกรอกข้อมูลที่จำเป็นให้ครบ",
      });
    }

    db.query(
      "SELECT * FROM users WHERE username = ?",
      [username],
      async (error, results) => {
        if (error) {
          console.error(error);
          await axios.post(process.env.DISCORD_WEBHOOK_SIGNIN, {
            embeds: [
              {
                title: "🔴 การเข้าสู่ระบบล้มเหลว",
                description: "มีข้อผิดพลาดเกิดขึ้นในการเข้าสู่ระบบ",
                color: 0xff0000,
                fields: [
                  {
                    name: "รายละเอียดข้อผิดพลาด",
                    value: `\`\`\`
ชื่อผู้ใช้: ${username}
ข้อผิดพลาด: ${error.message}
\`\`\``,
                  },
                ],
                footer: {
                  text: "ระบบการเข้าสู่ระบบ",
                },
                timestamp: new Date(),
              },
            ],
          });
          return res.status(500).json({ type: "error", message: "มีข้อผิดพลาดเกิดขึ้น" });
        }
        if (results.length === 0) {
          await axios.post(process.env.DISCORD_WEBHOOK_SIGNIN, {
            embeds: [
              {
                title: "🔴 การเข้าสู่ระบบล้มเหลว",
                description: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
                color: 0xff0000,
                fields: [
                  {
                    name: "ข้อมูลผู้ใช้",
                    value: `\`\`\`
ชื่อผู้ใช้: ${username}
สถานะ: ไม่พบผู้ใช้
\`\`\``,
                  },
                ],
                footer: {
                  text: "ระบบการเข้าสู่ระบบ",
                },
                timestamp: new Date(),
              },
            ],
          });
          return res
            .status(401)
            .json({ type: "error", message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
        }

        const user = results[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
          await axios.post(process.env.DISCORD_WEBHOOK_SIGNIN, {
            embeds: [
              {
                title: "🔴 การเข้าสู่ระบบล้มเหลว",
                description: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
                color: 0xff0000,
                fields: [
                  {
                    name: "ข้อมูลผู้ใช้",
                    value: `\`\`\`
ชื่อผู้ใช้: ${username}
สถานะ: รหัสผ่านไม่ถูกต้อง
\`\`\``,
                  },
                ],
                footer: {
                  text: "ระบบการเข้าสู่ระบบ",
                },
                timestamp: new Date(),
              },
            ],
          });
          return res
            .status(401)
            .json({ type: "error", message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
        }

        const token = jwt.sign(
          { username: user.username },
          process.env.JWT_SECRET,
          { expiresIn: rememberMe ? "7d" : "1d" }
        );

        // ส่งการแจ้งเตือนเมื่อเข้าสู่ระบบสำเร็จ
        await axios.post(process.env.DISCORD_WEBHOOK_SIGNIN, {
          embeds: [
            {
              title: "🟢 ผู้ใช้เข้าสู่ระบบสำเร็จ",
              description: "ผู้ใช้เข้าสู่ระบบสำเร็จ",
              color: 0x00ff00,
              fields: [
                {
                  name: "ข้อมูลผู้ใช้",
                  value: `\`\`\`
ชื่อผู้ใช้: ${username}
Token: ${token}
\`\`\``,
                },
              ],
              footer: {
                text: "ระบบการเข้าสู่ระบบ",
              },
              timestamp: new Date(),
            },
          ],
        });

        res.status(200).json({ type: "success", message: "เข้าสู่ระบบสำเร็จ", token });
      }
    );
  } catch (error) {
    console.error(error);
    // ส่งการแจ้งเตือนเมื่อเกิดข้อผิดพลาดทั่วไป
    await axios.post(process.env.DISCORD_WEBHOOK_SIGNIN, {
      embeds: [
        {
          title: "🔴 ข้อผิดพลาดทั่วไป",
          description: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ",
          color: 0xff0000,
          fields: [
            {
              name: "รายละเอียดข้อผิดพลาด",
              value: `\`\`\`
ข้อผิดพลาด: ${error.message}
\`\`\``,
            },
          ],
          footer: {
            text: "ระบบการเข้าสู่ระบบ",
          },
          timestamp: new Date(),
        },
      ],
    });
    return res.status(500).json({ type: "error", message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" });
  }
});

/* Forgot Password */

app.post("/forgot", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ type: "error", message: "รูปแบบอีเมลไม่ถูกต้อง" });
  }

  const token = jwt.sign(
    { email },
    process.env.JWT_SECRET_FORGOT,
    { expiresIn: "1h" }
  );

  try {
    await sendResetEmail(email, token);

    // ส่งการแจ้งเตือนเมื่ออีเมลถูกส่ง
    await axios.post(process.env.DISCORD_WEBHOOK_SIGNIN, {
      embeds: [
        {
          title: "🔑 การรีเซ็ตรหัสผ่าน",
          description: "มีการขอรีเซ็ตรหัสผ่านใหม่",
          color: 0x00ffff,
          fields: [
            {
              name: "ข้อมูลการรีเซ็ตรหัสผ่าน",
              value: `\`\`\`
ชื่อผู้ใช้: ${email}
Token: ${token}
\`\`\``,
              inline: false,
            },
          ],
          footer: {
            text: "ระบบการรีเซ็ตรหัสผ่าน",
          },
          timestamp: new Date(),
        },
      ],
    });

    return res.status(200).json({ type: "success", message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    await axios.post(process.env.DISCORD_WEBHOOK_SIGNIN, {
      embeds: [
        {
          title: "🔴 ข้อผิดพลาดในการรีเซ็ตรหัสผ่าน",
          description: "เกิดข้อผิดพลาดในการส่งอีเมลรีเซ็ตรหัสผ่าน",
          color: 0xff0000,
          fields: [
            {
              name: "ข้อมูลการรีเซ็ตรหัสผ่าน",
              value: `\`\`\`
Email: ${email}
ข้อผิดพลาด: ${error.message}
\`\`\``,
              inline: false,
            },
          ],
          footer: {
            text: "ระบบการรีเซ็ตรหัสผ่าน",
          },
          timestamp: new Date(),
        },
      ],
    });
    return res.status(500).json({ type: "error", message: "There was an error sending the email" });
  }
});

async function sendResetEmail(email, token) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: '"AileenPF SHOP" <no-reply@example.com>',
    to: email,
    subject: "AileenPF SHOP - รีเซ็ตรหัสผ่าน",
    html: `
      <html>
      <head>
        <style>
          body {
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            background-color: #ffffff;
          }
          .container {
            width: 100%;
            text-align: center;
            max-width: 500px;
            margin: 0 auto;
            border: 1px solid grey;
          }
          .logo {
            width: 100%;
            height: auto;
            object-fit: cover;
          }
          .content {
            font-size: 16px;
            color: #2f2f2f;
            margin: 25px auto;
          }
          .title {
            font-size: 28px;
            font-weight: bold;
            color: #3579ff;
            margin-bottom: 5px;
          }
          .text {
            font-weight: bold;
            color: #1a1a1a;
          }
          .link {
            margin-top: 15px;
            color: #1a1a1a;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <img
            src="https://cdn.discordapp.com/attachments/1146425181103984750/1238140358932561971/Group_23.png?ex=663e3391&is=663ce211&hm=16de75860c54e9b290eb9593c9a73fec1eb170a8906adb724c0e6dede75f9dfa&"
            alt=""
            class="logo"
            draggable="false"
          />
          <div class="content">
            <div class="title">Password Reset</div>
            <p class="text">เราได้รับคําขอให้รีเซ็ตรหัสผ่านของคุณ โปรดยืนยันการรีเซ็ตเพื่อเลือกรหัสผ่านใหม่ มิฉะนั้นคุณสามารถเพิกเฉยต่ออีเมลนี้ได้</p>
            <a href="http://localhost:5173/Reset-password?token=${token}" class="link">รีเซ็ตรหัสผ่าน</a>
            <p>อีเมลผู้ดูแลระบบนี้ถูกส่งถึงคุณจาก AileenPF SHOP<br>© AileenPF SHOP 2024 สงวนลิขสิทธิ์.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  return transporter.sendMail(mailOptions);
}

app.post("/reset-password", async (req, res) => {
  let { email, password, confirmPassword, token } = req.body;

  try {
    if (!email || !password || !confirmPassword || !token) {
      return res.status(400).json({
        type: "error",
        message: "โปรดกรอกข้อมูลที่จำเป็นให้ครบ",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        type: "error",
        message: "รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        type: "error",
        message: "รูปแบบอีเมลไม่ถูกต้อง",
      });
    }

    jwt.verify(token, process.env.JWT_SECRET_FORGOT, async (err, decoded) => {
      if (err) {
        return res.status(401).json({
          type: "error",
          message: "โทเค็นไม่ถูกต้องหรือหมดอายุแล้ว",
        });
      }

      db.query("SELECT * FROM used_tokens WHERE token = ?", [token], async (error, results) => {
        if (error) {
          console.error(error);
          return res.status(500).json({
            type: "error",
            message: "มีข้อผิดพลาดเกิดขึ้น",
          });
        }

        if (results.length > 0) {
          return res.status(400).json({
            type: "error",
            message: "โทเค็นนี้ถูกใช้ไปแล้ว",
          });
        }

        db.query("SELECT * FROM users WHERE email = ?", [email], async (error, results) => {
          if (error) {
            console.error(error);
            return res.status(500).json({
              type: "error",
              message: "มีข้อผิดพลาดเกิดขึ้น",
            });
          }

          if (results.length === 0) {
            return res.status(404).json({
              type: "error",
              message: "ไม่พบอีเมลนี้ในระบบ",
            });
          }

          const hashedPassword = await bcrypt.hash(password, saltRounds);

          db.query("UPDATE users SET password = ? WHERE email = ?", [hashedPassword, email], (error) => {
            if (error) {
              console.error(error);
              return res.status(500).json({
                type: "error",
                message: "มีข้อผิดพลาดเกิดขึ้น",
              });
            }

            db.query("INSERT INTO used_tokens (token) VALUES (?)", [token], (error) => {
              if (error) {
                console.error(error);
                return res.status(500).json({
                  type: "error",
                  message: "มีข้อผิดพลาดเกิดขึ้น",
                });
              }

              // ส่งการแจ้งเตือนเมื่อรีเซ็ตรหัสผ่านสำเร็จ
              axios.post(process.env.DISCORD_WEBHOOK_SIGNIN, {
                embeds: [
                  {
                    title: "🔑 การรีเซ็ตรหัสผ่าน",
                    description: "ผู้ใช้ได้ทำการรีเซ็ตรหัสผ่านเรียบร้อยแล้ว",
                    color: 0x00ff00,
                    fields: [
                      {
                        name: "ข้อมูลการรีเซ็ตรหัสผ่าน",
                        value: `\`\`\`
ชื่อผู้ใช้: ${email}
Token: ${token}
\`\`\``,
                        inline: false,
                      },
                    ],
                    footer: {
                      text: "ระบบการรีเซ็ตรหัสผ่าน",
                    },
                    timestamp: new Date(),
                  },
                ],
              }).catch(error => {
                console.error("Error sending Discord notification:", error);
              });

              return res.status(200).json({
                type: "success",
                message: "รีเซ็ตรหัสผ่านสำเร็จ",
              });
            });
          });
        });
      });
    });
  } catch (error) {
    console.error(error);
    axios.post(process.env.DISCORD_WEBHOOK_SIGNIN, {
      embeds: [
        {
          title: "🔴 ข้อผิดพลาดในการรีเซ็ตรหัสผ่าน",
          description: "เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน",
          color: 0xff0000,
          fields: [
            {
              name: "ข้อมูลการรีเซ็ตรหัสผ่าน",
              value: `\`\`\`
Email: ${email}
ข้อผิดพลาด: ${error.message}
\`\`\``,
              inline: false,
            },
          ],
          footer: {
            text: "ระบบการรีเซ็ตรหัสผ่าน",
          },
          timestamp: new Date(),
        },
      ],
    }).catch(error => {
      console.error("Error sending Discord notification:", error);
    });

    return res.status(500).json({
      type: "error",
      message: "เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน",
    });
  }
});

/* Topups */

app.post("/angpro", (req, res) => {
  const { userId, urlAngpro } = req.body;

  if (!userId || !urlAngpro) {
    return res.status(400).json({ type: "error", message: "ข้อมูลไม่ครบถ้วน" });
  }

  twvoucher(process.env.MOBILE, urlAngpro)
    .then((redeemed) => {
      db.query("SELECT * FROM users WHERE id = ?", [userId], (err, results) => {
        if (err) {
          console.error("Error querying database:", err);
          return res
            .status(500)
            .json({ type: "error", message: "มีข้อผิดพลาดเกิดขึ้นในการค้นหาผู้ใช้" });
        }

        if (results.length === 0) {
          console.log("ไม่พบผู้ใช้ที่มี id:", userId);
          return res.status(404).json({ type: "error", message: "ไม่พบผู้ใช้" });
        }

        console.log("User found:", results[0]);

        const currentMoney = parseFloat(results[0].money);
        const additionalAmount = parseFloat(redeemed.amount);
        const newMoney = currentMoney + additionalAmount;
        const username = results[0].username;

        db.query(
          "UPDATE users SET money = ? WHERE id = ?",
          [newMoney, userId],
          (updateError) => {
            if (updateError) {
              console.error("Error updating user's money:", updateError);
              return res
                .status(500)
                .json({ type: "error", message: "มีข้อผิดพลาดเกิดขึ้นในการอัปเดตยอดเงิน" });
            }

            const updatedUser = {
              ...results[0],
              money: newMoney,
            };

            db.query(
              "INSERT INTO topups (user_id, username, type, amount) VALUES (?, ?, ?, ?)",
              [userId, username, "angpao", additionalAmount],
              (insertError) => {
                if (insertError) {
                  console.error("Error inserting top-up record:", insertError);
                  return res
                    .status(500)
                    .json({
                      type: "error", message: "มีข้อผิดพลาดเกิดขึ้นในการบันทึกการเติมเงิน",
                    });
                }

                axios.post(process.env.DISCORD_WEBHOOK_TOPUPS, {
                  embeds: [
                    {
                      title: "🧧 การเติมเงินสำเร็จ",
                      description: "ผู้ใช้ได้เติมเงินโดยใช้ซองอังเปาเรียบร้อยแล้ว",
                      color: 0x00ff00,
                      fields: [
                        {
                          name: "ข้อมูลการเติมเงิน",
                          value: `\`\`\`
ชื่อผู้ใช้: ${username}
ประเภท: ซองอังเปา
จำนวนเงิน: ${additionalAmount}
\`\`\``,
                          inline: false,
                        },
                      ],
                      footer: {
                        text: "ระบบการเติมเงิน",
                      },
                      timestamp: new Date(),
                    },
                  ],
                }).catch(error => {
                  console.error("Error sending Discord notification:", error);
                });

                return res.status(200).json({
                  type: "success",
                  message: "เติมเงินสำเร็จ",
                });
              }
            );
          }
        );
      });
    })
    .catch((err) => {
      console.error("Invalid voucher code:", err);
      return res
        .status(400)
        .json({ type: "error", message: "ซองอังเปาไม่ถูกต้องหรือถูกใช้ไปแล้ว" });
    });
});


app.post("/bank", upload.single("slip"), async (req, res) => {
  const { userId } = req.body;
  const slip = req.file;

  if (!userId || !slip) {
    return res.status(400).json({ type: "error", message: "กรุณาแนบสลิปการโอนเงิน" });
  }

  const lineNotifyToken = "VmTa3s5Bp5RamME7GPvSbDHccRiWIVotPIv1JpJPEPf";
  const branchId = "22166";
  const apiKey = "SLIPOK0CQO6PV";
  const localFilePath = path.resolve(__dirname, slip.path);
  const discordWebhookUrl = process.env.DISCORD_WEBHOOK_TOPUPS;

  try {
    // Process slip with SLIPOK API
    const form = new FormData();
    form.append("files", fs.createReadStream(localFilePath));
    form.append("log", "true");

    const response = await axios.post(
      `https://api.slipok.com/api/line/apikey/${branchId}`,
      form,
      {
        headers: {
          "x-authorization": apiKey,
          ...form.getHeaders(),
        },
      }
    );

    const slipData = response.data.data;
    const additionalAmount = parseFloat(slipData.amount);

    // Fetch user details
    const [userResults] = await db.promise().query("SELECT * FROM users WHERE id = ?", [userId]);
    if (userResults.length === 0) {
      return res.status(404).json({ type: "error", message: "ไม่พบผู้ใช้" });
    }

    const user = userResults[0];
    const currentMoney = parseFloat(user.money);
    const newMoney = currentMoney + additionalAmount;

    await db.promise().query("UPDATE users SET money = ? WHERE id = ?", [newMoney, userId]);

    await db.promise().query(
      "INSERT INTO topups (user_id, username, type, amount) VALUES (?, ?, ?, ?)",
      [userId, user.username, "bank", additionalAmount]
    );

    const successMessage = `การประมวลผลสลิปสำเร็จ: ได้รับเงินจำนวน ${additionalAmount} บาท`;
    await axios.post(
      "https://notify-api.line.me/api/notify",
      `message=${encodeURIComponent(successMessage)}`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${lineNotifyToken}`,
        },
      }
    );
    console.log("LINE Notify message sent successfully");

    await axios.post(discordWebhookUrl, {
      embeds: [
        {
          title: "💸 การเติมเงินสำเร็จ",
          description: "การประมวลผลสลิปสำเร็จ",
          color: 0x00ff00,
          fields: [
            {
              name: "ข้อมูลการเติมเงิน",
              value: `\`\`\`
ชื่อผู้ใช้: ${user.username}
ประเภท: ธนาคาร
จำนวนเงิน: ${additionalAmount} บาท
\`\`\``,
              inline: false,
            },
          ],
          footer: {
            text: "ระบบการเติมเงิน",
          },
          timestamp: new Date(),
        },
      ],
    });
    console.log("Discord notification sent successfully");

    return res.status(201).json({
      type: "success",
      message: `เติมเงินสำเร็จ จำนวน: ${additionalAmount} บาท`,
      user: { ...user, money: newMoney },
    });
  } catch (error) {
    console.error("Error processing bank slip:", error);

    let user;
    try {
      const [userResults] = await db.promise().query("SELECT * FROM users WHERE id = ?", [userId]);
      if (userResults.length > 0) {
        user = userResults[0];
      }
    } catch (dbError) {
      console.error("Error fetching user for error notification:", dbError);
    }

    // Notify LINE about the error
    const errorMessage = `เกิดข้อผิดพลาดในการประมวลผลสลิป: ${error.message}`;
    await axios.post(
      "https://notify-api.line.me/api/notify",
      `message=${encodeURIComponent(errorMessage)}`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${lineNotifyToken}`,
        },
      }
    ).catch(notifyErr => {
      console.error("Failed to send LINE Notify message:", notifyErr.message);
    });

    // Notify Discord about the error
    await axios.post(discordWebhookUrl, {
      embeds: [
        {
          title: "🚨 การเติมเงินไม่สำเร็จ",
          description: "เกิดข้อผิดพลาดในการประมวลผลสลิป",
          color: 0xff0000,
          fields: [
            {
              name: "ข้อมูลการเติมเงิน",
              value: `\`\`\`
ชื่อผู้ใช้: ${user ? user.username : userId}
ประเภท: ธนาคาร
\`\`\``,
              inline: false,
            },
            {
              name: "ข้อผิดพลาด",
              value: `\`\`\`
${error.message}
\`\`\``,
              inline: false,
            },
          ],
          footer: {
            text: "ระบบการเติมเงิน",
          },
          timestamp: new Date(),
        },
      ],
    }).catch(discordErr => {
      console.error("Failed to send Discord notification:", discordErr.message);
    });

    return res.status(500).json({ type: "error", message: "มีข้อผิดพลาดเกิดขึ้นในการประมวลผลสลิป", error: error.message });
  } finally {
    // Clean up local file
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
  }
});



/* Get Data */

app.get("/users", async (req, res) => {
  try {
    db.query("SELECT * FROM users", (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: "มีข้อผิดพลาดเกิดขึ้น" });
      }
      res.status(200).json(results);
    });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Token ไม่ถูกต้อง" });
  }
});

app.get("/products", async (req, res) => {
  try {
    db.query("SELECT * FROM products", (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: "มีข้อผิดพลาดเกิดขึ้น" });
      }
      res.status(200).json(results);
    });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Token ไม่ถูกต้อง" });
  }
});

app.get("/data", async (req, res) => {
  try {
    db.query("SELECT * FROM data", (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: "มีข้อผิดพลาดเกิดขึ้น" });
      }
      res.status(200).json(results);
    });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Token ไม่ถูกต้อง" });
  }
});

app.get("/topups", async (req, res) => {
  try {
    db.query("SELECT * FROM topups", (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: "มีข้อผิดพลาดเกิดขึ้น" });
      }
      res.status(200).json(results);
    });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Token ไม่ถูกต้อง" });
  }
});

app.get("/category", async (req, res) => {
  try {
    db.query("SELECT * FROM category", (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: "มีข้อผิดพลาดเกิดขึ้น" });
      }
      res.status(200).json(results);
    });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Token ไม่ถูกต้อง" });
  }
});

app.get("/sell", async (req, res) => {
  try {
    db.query("SELECT * FROM sell", (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: "มีข้อผิดพลาดเกิดขึ้น" });
      }
      res.status(200).json(results);
    });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Token ไม่ถูกต้อง" });
  }
});

app.get("/topupgame", async (req, res) => {
  try {
    db.query("SELECT * FROM topupgame", (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: "มีข้อผิดพลาดเกิดขึ้น" });
      }
      res.status(200).json(results);
    });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Token ไม่ถูกต้อง" });
  }
});

app.get("/events", async (req, res) => {
  try {
    db.query("SELECT * FROM events", (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: "มีข้อผิดพลาดเกิดขึ้น" });
      }
      res.status(200).json(results);
    });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Token ไม่ถูกต้อง" });
  }
});

app.get("/historyevents", async (req, res) => {
  try {
    db.query("SELECT * FROM historyevent", (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: "มีข้อผิดพลาดเกิดขึ้น" });
      }
      res.status(200).json(results);
    });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Token ไม่ถูกต้อง" });
  }
});

app.get("/reviews", async (req, res) => {
  try {
    db.query("SELECT * FROM reviews", (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: "มีข้อผิดพลาดเกิดขึ้น" });
      }
      res.status(200).json(results);
    });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Token ไม่ถูกต้อง" });
  }
});

app.get("/like", async (req, res) => {
  try {
    db.query("SELECT * FROM likeComment", (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: "มีข้อผิดพลาดเกิดขึ้น" });
      }
      res.status(200).json(results);
    });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Token ไม่ถูกต้อง" });
  }
});

/* Payment Product */

app.post("/payment", async (req, res) => {
  const { userId, userEmail, productId } = req.body;
  const statusProduct = 0;

  try {
    // Fetch user details
    const [userResults] = await db.promise().query("SELECT * FROM users WHERE id = ?", [userId]);
    if (userResults.length === 0) {
      return res.status(404).json({ type: "error", message: "ไม่พบผู้ใช้" });
    }

    const userMoney = Math.round(userResults[0].money * 100);
    const username = userResults[0].username;

    // Fetch product details
    const [productResults] = await db.promise().query("SELECT title, price, status FROM products WHERE product_id = ?", [productId]);
    if (productResults.length === 0) {
      return res.status(404).json({ type: "warning", message: "ไม่พบสินค้า" });
    }

    const productPrice = Math.round(productResults[0].price * 100);
    const productStatus = productResults[0].status;
    const productName = productResults[0].title;

    if (productStatus === 0) {
      return res.status(400).json({ type: "warning", message: "สินค้าถูกจำหน่ายไปแล้ว" });
    }

    if (userMoney < productPrice) {
      return res.status(400).json({ type: "warning", message: "ยอดเงินของคุณไม่เพียงพอ" });
    }

    // Fetch data related to the product
    const [dataResults] = await db.promise().query("SELECT password FROM data WHERE product_id = ?", [productId]);
    if (dataResults.length === 0) {
      return res.status(404).json({ type: "error", message: "ไม่พบข้อมูลของสินค้า" });
    }

    const newMoney = userMoney - productPrice;
    await db.promise().query("UPDATE users SET money = ? WHERE id = ?", [newMoney / 100, userId]);
    await db.promise().query("UPDATE products SET status = ? WHERE product_id = ?", [statusProduct, productId]);
    const { password } = dataResults[0];
    await db.promise().query(
      "INSERT INTO sell (user_id, product_id, payment, email, username, password) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, productId, productPrice / 100, userEmail, username, password]
    );

    const [finalUserResults] = await db.promise().query("SELECT * FROM users WHERE id = ?", [userId]);

    axios.post(process.env.DISCORD_WEBHOOK_SALES, {
      embeds: [
        {
          title: "💸 สั่งซื้อสำเร็จ",
          description: "ผู้ใช้ได้ซื้อสินค้าสำเร็จแล้ว",
          color: 0x00ff00,
          fields: [
            {
              name: "ข้อมูลการซื้อสินค้า",
              value: `\`\`\`
ชื่อผู้ใช้: ${username}
สินค้า: ${productName}
ราคาสินค้า: ${productPrice / 100} บาท
\`\`\``,
              inline: false,
            },
          ],
          footer: {
            text: "ระบบการจัดการสินค้า",
          },
          timestamp: new Date(),
        },
      ],
    }).catch(error => {
      console.error("Error sending Discord notification:", error);
    });

    return res.status(201).json({
      message: "ซื้อสินค้าสำเร็จ",
      user: finalUserResults[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ type: "error", message: "มีข้อผิดพลาดเกิดขึ้น" });
  }
});


/* Spin Wheel */

app.post("/Spin", async (req, res) => {
  const { userId } = req.body;
  const price = 3000;

  try {
    await db.promise().query("START TRANSACTION");

    const [userResults] = await db
      .promise()
      .query("SELECT * FROM users WHERE id = ?", [userId]);

    if (userResults.length === 0) {
      await db.promise().query("ROLLBACK");
      return res.status(404).json({ type: "error", message: "ไม่พบผู้ใช้" });
    }

    const userMoney = Math.round(userResults[0].money * 100);

    if (userMoney < price) {
      await db.promise().query("ROLLBACK");
      return res.status(400).json({ type: "warning", message: "ยอดเงินของคุณไม่เพียงพอ" });
    }

    const newMoney = userMoney - price;
    await db
      .promise()
      .query("UPDATE users SET money = ? WHERE id = ?", [
        newMoney / 100,
        userId,
      ]);

    const [finalUserResults] = await db
      .promise()
      .query("SELECT * FROM users WHERE id = ?", [userId]);

    await db.promise().query("COMMIT");

    return res.status(201).json({
      type: "success",
      message: "ขอให้คุณโชคดี",
      user: finalUserResults[0],
    });
  } catch (error) {
    console.error(error);

    await db.promise().query("ROLLBACK");

    return res.status(500).json({ type: "error", message: "มีข้อผิดพลาดเกิดขึ้น" });
  }
});

/* Reward Wheel */

app.post("/reward", async (req, res) => {
  const { userId, reward } = req.body;
  const type = 'wheel';

  try {
    await db.promise().query("START TRANSACTION");

    const [userResults] = await db
      .promise()
      .query("SELECT * FROM users WHERE id = ?", [userId]);

    if (userResults.length === 0) {
      await db.promise().query("ROLLBACK");
      return res.status(404).json({ type: "error", message: "ไม่พบผู้ใช้" });
    }

    const user = userResults[0];
    const userMoney = Math.round(user.money * 100);
    const newMoney = userMoney + Math.round(reward * 100);

    await db
      .promise()
      .query("UPDATE users SET money = ? WHERE id = ?", [
        newMoney / 100,
        userId,
      ]);

    await db
      .promise()
      .query("INSERT INTO historyevent (user_id, type, price, reward) VALUES (?, ?, ?, ?)", [
        userId,
        type,
        30,
        reward,
      ]);

    const [finalUserResults] = await db
      .promise()
      .query("SELECT * FROM users WHERE id = ?", [userId]);

    await db.promise().query("COMMIT");

    axios.post(process.env.DISCORD_WEBHOOK_EVENTS, {
      embeds: [
        {
          title: "✨ กิจกกรมสำเร็จ",
          description: "ผู้ใช้ได้เล่นกิจรรมสำเร็จแล้ว",
          color: 0x00ff00,
          fields: [
            {
              name: "ข้อมูลการหมุนวงล้อ",
              value: `\`\`\`
ชื่อผู้ใช้: ${user.username}
ประเภท: ${type}
ราคา: 30 บาท
รางวัล: ${reward} บาท
\`\`\``,
              inline: false,
            },
          ],
          footer: {
            text: "สุ่มรางวัลครั้งละ 30 บาท",
          },
          timestamp: new Date(),
        },
      ],
    }).catch(error => {
      console.error("Error sending Discord notification:", error);
    });

    return res.status(201).json({
      type: "success",
      message: "ยินดีด้วย! รางวัลของคุณได้รับการเพิ่มแล้ว",
      user: finalUserResults[0],
    });
  } catch (error) {
    console.error(error);

    await db.promise().query("ROLLBACK");

    return res.status(500).json({ type: "error", message: "มีข้อผิดพลาดเกิดขึ้น" });
  }
});



/* comment */

app.post("/addComment", async (req, res) => {
  const { userId, productId, comment } = req.body;

  try {
    // Check if user exists
    const [userResults] = await db.promise().query("SELECT username FROM users WHERE id = ?", [userId]);
    if (userResults.length === 0) {
      return res.status(404).json({ type: "error", message: "ไม่พบผู้ใช้" });
    }

    const username = userResults[0].username;

    // Check if product exists
    const [productResults] = await db.promise().query("SELECT title FROM products WHERE product_id = ?", [productId]);
    const productName = productResults.length > 0 ? productResults[0].title : "ไม่พบสินค้า";

    // Insert review
    await db.promise().query(
      "INSERT INTO reviews (user_id, product_id, comment) VALUES (?, ?, ?)",
      [userId, productId, comment]
    );

    await axios.post(process.env.DISCORD_WEBHOOK_REVIEW, {
      embeds: [
        {
          title: "📝 เขียนรีวิวสำเร็จ",
          description: "ผู้ใช้ได้เขียนรีวิวสำเร็จแล้ว",
          color: 0x00ff00,
          fields: [
            {
              name: "ข้อมูลการเขียนรีวิว",
              value: `\`\`\`
ชื่อผู้ใช้: ${username}
สินค้า: ${productName}
รีวิว: ${comment}
\`\`\``,
              inline: false,
            },
          ],
          footer: {
            text: "การจัดการเขียนรีวิว",
          },
          timestamp: new Date(),
        },
      ],
    });

    return res.status(201).json({
      type: "success",
      message: "เพิ่มความคิดเห็นสำเร็จ",
    });

  } catch (error) {
    console.error("Error in /addComment:", error);

    return res.status(500).json({
      type: "error",
      message: "เพิ่มความคิดเห็นไม่สำเร็จ",
    });
  }
});


app.post("/removeComment", async (req, res) => {
  const { userId, commentId } = req.body;

  try {
    const [userResults] = await db.promise().query("SELECT username FROM users WHERE id = ?", [userId]);
    if (userResults.length === 0) {
      return res.status(404).json({ type: "error", message: "ไม่พบผู้ใช้" });
    }

    const username = userResults[0].username;

    const [commentResults] = await db.promise().query("SELECT * FROM reviews WHERE id = ? AND user_id = ?", [commentId, userId]);
    if (commentResults.length === 0) {
      return res.status(404).json({ type: "error", message: "ไม่พบความคิดเห็นที่ต้องการลบ" });
    }

    const comment = commentResults[0].comment;

    await db.promise().query("DELETE FROM likecomment WHERE comment_id = ?", [commentId]);

    await db.promise().query("DELETE FROM reviews WHERE id = ? AND user_id = ?", [commentId, userId]);

    await axios.post(process.env.DISCORD_WEBHOOK_REVIEW, {
      embeds: [
        {
          title: "🗑️ ลบรีวิวสำเร็จ",
          description: "ผู้ใช้ได้ลบรีวิวสำเร็จแล้ว",
          color: 0xff0000,
          fields: [
            {
              name: "ข้อมูลการลบรีวิว",
              value: `\`\`\`
ชื่อผู้ใช้: ${username}
รีวิว: ${comment}
\`\`\``,
              inline: false,
            },
          ],
          footer: {
            text: "การจัดการเขียนรีวิว",
          },
          timestamp: new Date(),
        },
      ],
    }).catch(error => {
      console.error("Error sending Discord notification:", error);
    });

    return res.status(200).json({
      type: "success",
      message: "ลบความคิดเห็นสำเร็จ",
    });

  } catch (error) {
    console.error("Error in /removeComment:", error);

    return res.status(500).json({
      type: "error",
      message: "ไม่สามารถลบความคิดเห็นได้",
    });
  }
});


app.post("/addLike", async (req, res) => {
  const { userId, commentId } = req.body;

  try {
    const [userResults] = await db
      .promise()
      .query("SELECT * FROM users WHERE id = ?", [userId]);
    if (userResults.length === 0) {
      return res.status(404).json({ type: "error", message: "ไม่พบผู้ใช้" });
    }

    await db
      .promise()
      .query(
        "INSERT INTO likeComment (user_id, comment_id) VALUES (?, ?)",
        [userId, commentId]
      );

    return res.status(201).json({
      type: "success",
      message: "กดไลค์สำเร็จ",
    });

  } catch (error) {
    console.error(error);

    return res.status(201).json({
      type: "error",
      message: "กดไลค์สำเร็จ",
    });
  }
});

app.post("/removeLike", async (req, res) => {
  const { userId, commentId } = req.body;

  try {
    const [userResults] = await db
      .promise()
      .query("SELECT * FROM users WHERE id = ?", [userId]);
    if (userResults.length === 0) {
      return res.status(404).json({ type: "error", message: "ไม่พบผู้ใช้" });
    }

    await db
      .promise()
      .query(
        "DELETE FROM likeComment WHERE user_id = ? AND comment_id = ?",
        [userId, commentId]
      );

    return res.status(200).json({
      type: "success",
      message: "เอาไลค์ออกสำเร็จ",
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      type: "error",
      message: "เอาไลค์ออกสำเร็จ",
    });
  }
});


/* Admin */

const crypto = require('crypto');

app.post("/add-product", async (req, res) => {
  const {
    title,
    detail,
    category,
    price,
    username,
    password,
    image1,
    image2,
    image3,
    image4,
    image5,
    image6,
    status,
    newProduct,
    recommendProduct,
  } = req.body;

  try {
    if (!title || !detail || !category || !price || !username || !password) {
      return res.status(400).json({
        message: "โปรดกรอกข้อมูลที่จำเป็นให้ครบ",
      });
    }

    const productId = crypto.randomInt(100000000, 1000000000);

    db.query(
      "INSERT INTO products (product_id, image1, image2, image3, image4, image5, image6, title, detail, category, price, new, recommend, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        productId,
        image1,
        image2,
        image3,
        image4,
        image5,
        image6,
        title,
        detail,
        category,
        price,
        newProduct,
        recommendProduct,
        status,
      ],
      (error, results) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: "มีข้อผิดพลาดเกิดขึ้น" });
        }

        db.query(
          "INSERT INTO data (product_id, username, password) VALUES (?, ?, ?)",
          [productId, username, password],
          (error, results) => {
            if (error) {
              console.error(error);
              return res.status(500).json({ message: "มีข้อผิดพลาดเกิดขึ้น" });
            }

            return res.status(201).json({ message: "เพิ่มสินค้าเสร็จสิ้น" });
          }
        );
      }
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในการเพิ่มสินค้า" });
  }
});

app.post("/update-product", async (req, res) => {
  const {
    title,
    detail,
    category,
    price,
    username,
    password,
    image1,
    image2,
    image3,
    image4,
    image5,
    image6,
    status,
    newProduct,
    recommendProduct,
  } = req.body;

  try {

    const productId = crypto.randomInt(100000000, 1000000000);

    db.query(
      "UPDATE products (product_id, image1, image2, image3, image4, image5, image6, title, detail, category, price, new, recommend, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        productId,
        image1,
        image2,
        image3,
        image4,
        image5,
        image6,
        title,
        detail,
        category,
        price,
        newProduct,
        recommendProduct,
        status,
      ],
      (error, results) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: "มีข้อผิดพลาดเกิดขึ้น" });
        }

        db.query(
          "UPDATE data (product_id, username, password) VALUES (?, ?, ?)",
          [productId, username, password],
          (error, results) => {
            if (error) {
              console.error(error);
              return res.status(500).json({ message: "มีข้อผิดพลาดเกิดขึ้น" });
            }

            return res.status(201).json({ message: "เพิ่มสินค้าเสร็จสิ้น" });
          }
        );
      }
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในการเพิ่มสินค้า" });
  }
});

app.post("/delete-product", async (req, res) => {
  const { productId } = req.body;

  try {
    if (!productId) {
      return res.status(400).json({
        message: "โปรดกรอกข้อมูลที่จำเป็นให้ครบ",
      });
    }

    db.query(
      "DELETE FROM products WHERE id = ?",
      [productId],
      (error, results) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: "มีข้อผิดพลาดเกิดขึ้น" });
        }
        return res.status(201).json({ message: "ลบสินค้าเสร็จสิ้น" });
      }
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในการเพิ่มสินค้า" });
  }
});
app.post("/delete-user", async (req, res) => {
  const { userId } = req.body;

  try {
    if (!userId) {
      return res.status(400).json({
        message: "โปรดกรอกข้อมูลที่จำเป็นให้ครบ",
      });
    }

    db.query(
      "DELETE FROM users WHERE id = ?",
      [userId],
      (error, results) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: "มีข้อผิดพลาดเกิดขึ้น" });
        }
        return res.status(201).json({ message: "ลบผู้ใช้เสร็จสิ้น" });
      }
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบผู้ใช้" });
  }
});



app.post("/update-user", async (req, res) => {
  const { userId, urole, money } = req.body;

  try {
    db.query(
      "SELECT * FROM users WHERE id = ?",
      [userId],
      async (error) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: "มีข้อผิดพลาดเกิดขึ้น" });
        }

        db.query(
          "UPDATE users SET urole = ?, money = ? WHERE id = ?",
          [urole, money, userId],
          (error) => {
            if (error) {
              console.error(error);
              return res.status(500).json({ message: "มีข้อผิดพลาดเกิดขึ้น" });
            }

            db.query(
              "SELECT * FROM users WHERE id = ?",
              [userId],
              (error) => {
                if (error) {
                  console.error(error);
                  return res
                    .status(500)
                    .json({ message: "มีข้อผิดพลาดเกิดขึ้น" });
                }

                return res.status(200).json({
                  message: "อัปเดตข้อมูลเรียบร้อยแล้ว"
                });
              }
            );
          }
        );
      }
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในการแก้ไขข้อมูล" });
  }
});

app.post("/change-user", async (req, res) => {
  const { userId, selectedProfile, username, email, password } = req.body;

  try {
    db.query(
      "SELECT * FROM users WHERE id = ?",
      [userId],
      async (error, results) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: "มีข้อผิดพลาดเกิดขึ้น" });
        }

        if (results.length === 0) {
          return res
            .status(401)
            .json({ message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
        }

        const user = results[0];

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res
            .status(401)
            .json({ message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
        }

        db.query(
          "UPDATE users SET profile = ?, username = ?, email = ? WHERE id = ?",
          [selectedProfile, username, email, userId],
          (error) => {
            if (error) {
              console.error(error);
              return res.status(500).json({ message: "มีข้อผิดพลาดเกิดขึ้น" });
            }

            db.query(
              "SELECT * FROM users WHERE id = ?",
              [userId],
              (error, updatedResults) => {
                if (error) {
                  console.error(error);
                  return res
                    .status(500)
                    .json({ message: "มีข้อผิดพลาดเกิดขึ้น" });
                }

                const updatedUser = updatedResults[0];
                return res.status(200).json({
                  message: "อัปเดตข้อมูลเรียบร้อยแล้ว",
                  user: updatedUser,
                });
              }
            );
          }
        );
      }
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในการแก้ไขข้อมูล" });
  }
});

app.post("/change-password", async (req, res) => {
  const { userId, password_n, password_c, password } = req.body;

  if (password_n !== password_c) {
    return res.status(400).json({ message: "รหัสผ่านใหม่ไม่ตรงกัน" });
  }

  try {
    db.query(
      "SELECT * FROM users WHERE id = ?",
      [userId],
      async (error, results) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: "มีข้อผิดพลาดเกิดขึ้น" });
        }

        if (results.length === 0) {
          return res.status(404).json({ message: "ไม่พบผู้ใช้" });
        }

        const user = results[0];

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res
            .status(401)
            .json({ message: "รหัสผ่านปัจจุบันไม่ถูกต้อง" });
        }

        const hashedNewPassword = await bcrypt.hash(password_n, 10);

        db.query(
          "UPDATE users SET password = ? WHERE id = ?",
          [hashedNewPassword, userId],
          (error) => {
            if (error) {
              console.error(error);
              return res.status(500).json({ message: "มีข้อผิดพลาดเกิดขึ้น" });
            }

            return res
              .status(200)
              .json({ message: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว" });
          }
        );
      }
    );
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน" });
  }
});

app.post("/reload", async (req, res) => {
  const { ReloadId } = req.body;

  try {
    db.query(
      "SELECT * FROM users WHERE id = ?",
      [ReloadId],
      async (error, results) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: "มีข้อผิดพลาดเกิดขึ้น" });
        }

        if (results.length === 0) {
          return res.status(404).json({ message: "ไม่พบผู้ใช้งานที่ระบุ" });
        }

        const user = results[0];

        res.status(200).json({ message: "รีโหลดสำเร็จ", user: user });
      }
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในการรีโหลด" });
  }
});


const dataFilePath = path.join(__dirname, 'channelData.json');

function saveChannelData(guildId, channelId, type, channelNameInput) {
  const data = {
    guildId,
    channelId,
    type,
    channelNameInput
  };
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
}

function loadChannelData() {
  if (fs.existsSync(dataFilePath)) {
    const data = fs.readFileSync(dataFilePath);
    return JSON.parse(data);
  }
  return null;
}


const { Client, IntentsBitField, PermissionsBitField } = require('discord.js');
const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildMessageTyping,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildVoiceStates
  ]
});

client.once('ready', async () => {
  console.log(`${client.user.tag} is ready!`);

  const guildId = process.env.DISCORD_GUILDID;
  const guild = client.guilds.cache.get(guildId);

  if (!guild) {
    console.error('Guild not found.');
    return;
  }

  const allMemberChannelId = '1275655904158679051';
  const memberChannelId = '1275656125123133453';
  const botChannelId = '1275656272191946835';
  const roleId = '1175833756087615518';

  const updateChannels = async () => {
    try {
      await guild.members.fetch();

      const humanMembers = guild.members.cache.filter(member => !member.user.bot).size;
      const botMembers = guild.members.cache.filter(member => member.user.bot).size;

      const role = guild.roles.cache.get(roleId);
      if (!role) {
        console.error(`Role with ID ${roleId} not found.`);
        return;
      }

      const roleMembers = role.members.filter(member => !member.user.bot).size;

      const updateChannel = async (channelId, name, channelDescription) => {
        const channel = guild.channels.cache.get(channelId);
        if (channel) {
          await channel.setName(name);
        } else {
          console.error(`${channelDescription} Channel ${channelId} not found.`);
        }
      };

      await Promise.all([
        updateChannel(allMemberChannelId, `╏₊˚💿﹕𝐀𝐥𝐥 𝐌𝐞𝐦𝐛𝐞𝐫𝐬: ${humanMembers}`, 'All Members'),
        updateChannel(memberChannelId, `╏₊˚📀﹕𝐌𝐞𝐦𝐛𝐞𝐫𝐬: ${roleMembers}`, 'Members'),
        updateChannel(botChannelId, `╏₊˚🤖﹕𝐁𝐎𝐓𝐬: ${botMembers}`, 'Bots')
      ]);

    } catch (error) {
      console.error('Error updating channels:', error);
    }
  };

  setInterval(updateChannels, 60000);

  // Event listeners for member updates
  client.on('guildMemberAdd', updateChannels);
  client.on('guildMemberRemove', updateChannels);
  client.on('guildMemberUpdate', updateChannels);

  // Initial update when the bot starts
  updateChannels();
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'stats') {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const type = interaction.options.getString('type');
    const channelNameInput = interaction.options.getString('channelname');

    try {
      const newChannel = await guild.channels.create({
        name: channelNameInput,
        type: 2, // Voice channel
        permissionOverwrites: [
          {
            id: guild.roles.everyone,
            allow: [PermissionsBitField.Flags.ViewChannel],
            deny: [
              PermissionsBitField.Flags.Connect,
              PermissionsBitField.Flags.Speak
            ],
          }
        ]
      });

      const channelInfo = { channelId: newChannel.id, type, channelNameInput };
      channelsToUpdate.push(channelInfo);
      saveChannelData(guild.id, newChannel.id, type, channelNameInput);

      await interaction.editReply({ content: `สร้างช่อง ${newChannel.name} สำเร็จแล้ว!` });
    } catch (error) {
      console.error('Error creating channel:', error);
      await interaction.editReply({ content: 'เกิดข้อผิดพลาดในการสร้างช่อง.' });
    }
  }
});

client.on('guildMemberAdd', async member => {
  const welcomeChannelId = '1175823543955636333';
  const welcomeMessage = 'ยินดีต้อนรับเข้าสู่เซิร์ฟเวอร์!';
  const channel = member.guild.channels.cache.get(welcomeChannelId);

  if (!channel) {
    console.error('Channel not found.');
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("₊₊₊₊₊₊₊₊ 𝓦𝓮𝓵𝓬𝓸𝓶𝓮 💌 ˚₊₊₊₊₊₊₊₊")
    .setDescription(`**สวัสดี ${member.user.username}! ${welcomeMessage}**`)
    .setImage('https://cdn.discordapp.com/attachments/1275416004381380609/1275416087575400541/received_2758242251063419.gif')
    .setColor(0x00FF00)
    .setFooter({ text: 'ขอบคุณที่เข้าร่วม!' })
    .setThumbnail(member.user.displayAvatarURL())
    .setTimestamp();

  try {
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error sending welcome message:', error);
  }
});

client.on('guildMemberRemove', async member => {
  const byeChannelId = '1275420770205433857';
  const channel = member.guild.channels.cache.get(byeChannelId);

  if (!channel) {
    console.error('Channel not found.');
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("₊₊₊₊₊₊₊₊ 𝓖𝓸𝓸𝓭 𝓫𝔂𝓮 👋 ˚₊₊₊₊₊₊₊₊")
    .setDescription(`**สมาชิก ${member.user.username} ได้ออกจากเซิร์ฟเวอร์**`)
    .setImage('https://cdn.discordapp.com/attachments/1275416004381380609/1275416087575400541/received_2758242251063419.gif')
    .setColor(0xFF0000)
    .setFooter({ text: 'เราหวังว่าจะได้พบคุณอีกครั้ง!' })
    .setThumbnail(member.user.displayAvatarURL())
    .setTimestamp();

  try {
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error sending leave message:', error);
  }
});

app.listen(3002, () => {
  console.log(`Server is running...`);
});
