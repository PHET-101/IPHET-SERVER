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
    origin: ["http://localhost:5173", "https://aileenpf-shop.com", "https://iphet-store.web.app"],
    methods: ["POST", "GET", "DELETE"],
    credentials: true,
  })
);

const saltRounds = parseInt(process.env.SALT_ROUNDS);
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: 3306
});

db.connect(err => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    return;
  }
  console.log('Connected to database.');
});

app.get("/", (req, res) => {
  db.connect((err) => {
    if (err) {
      res.send('Database connection failed: ' + err.stack);
    } else {
      res.send('Connected to database successfully.');
    }
  });
});


const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(403).send({ auth: false, message: 'No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(403).send({ auth: false, message: 'No token provided.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
    }
    req.userId = decoded.id;
    req.userRole = decoded.urole;
    req.user = { username: decoded.username };
    next();
  });

};

app.get("/protected", verifyToken, (req, res) => {
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

app.get('/admin', verifyToken, (req, res) => {
  if (req.userRole !== 'admin') {
    console.error('Access denied for user:', req.userRole);
    return res.status(403).send({ message: 'Access denied.', urole: req.userRole });
  }
  res.status(200).send({ message: 'Welcome to the admin area', urole: req.userRole });
});

/* Get Data */

app.get("/website", async (req, res) => {
  try {
    const id = 1; // กำหนดค่า id เป็น 1
    db.query("SELECT * FROM website WHERE id = ?", [id], (error, results) => {
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
    db.query("SELECT * FROM likecomment", (error, results) => {
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
















/* Post Data*/

/* Register */

app.post("/signup", async (req, res) => {
  let { usernameNew, emailNew, passwordNew, confirmPassword, termsAgreed } = req.body;
  const urole = "user";

  const username = usernameNew ? usernameNew.toLowerCase() : '';
  const email = emailNew ? emailNew.toLowerCase() : '';

  try {
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

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(passwordNew, saltRounds);

    await db.promise().query(
      "INSERT INTO users (username, email, password, urole) VALUES (?, ?, ?, ?)",
      [username, email, hashedPassword, urole]
    );

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
          return res.status(500).json({ type: "error", message: "มีข้อผิดพลาดเกิดขึ้น" });
        }
        if (results.length === 0) {
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
            .json({ type: "error", message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง", auth: false, token: null });
        }

        const token = jwt.sign(
          {
            id: user.id,
            urole: user.urole,
            username: user.username
          },
          process.env.JWT_SECRET,
          { expiresIn: rememberMe ? "7d" : "1d" }
        );


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
สถานะ: ${user.urole} 
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

        res.status(200).send({ type: "success", message: "เข้าสู่ระบบสำเร็จ", auth: true, token: token });
      }
    );
  } catch (error) {
    console.error(error);
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

/* Payment Product */

app.post("/payment", async (req, res) => {
  const { userId, userEmail, productId } = req.body;
  const statusProduct = 0;

  try {
    const [userResults] = await db.promise().query("SELECT * FROM users WHERE id = ?", [userId]);
    if (userResults.length === 0) {
      return res.status(404).json({ type: "error", message: "ไม่พบผู้ใช้" });
    }

    const userMoney = Math.round(userResults[0].money * 100);
    const userUsername = userResults[0].username;
    const initialUserMoney = userResults[0].money;

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

    const [dataResults] = await db.promise().query("SELECT username, password FROM data WHERE product_id = ?", [productId]);
    if (dataResults.length === 0) {
      return res.status(404).json({ type: "error", message: "ไม่พบข้อมูลของสินค้า" });
    }

    const newMoney = userMoney - productPrice;
    await db.promise().query("UPDATE users SET money = ? WHERE id = ?", [newMoney / 100, userId]);
    await db.promise().query("UPDATE products SET status = ? WHERE product_id = ?", [statusProduct, productId]);

    const { username: productUsername, password } = dataResults[0];

    await db.promise().query(
      "INSERT INTO sell (user_id, product_id, payment, email, username, password) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, productId, productPrice / 100, userEmail, productUsername, password]
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
ชื่อผู้ใช้: ${userUsername}
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

    // Send error notification to Discord
    axios.post(process.env.DISCORD_WEBHOOK_SALES, {
      embeds: [
        {
          title: "⚠️ เกิดข้อผิดพลาดในการทำรายการ",
          description: "เกิดข้อผิดพลาดขณะทำการสั่งซื้อสินค้า",
          color: 0xff0000,
          fields: [
            {
              name: "ชื่อผู้ใช้",
              value: `\`\`\`${userUsername}\`\`\``,
              inline: true,
            },
            {
              name: "สินค้า",
              value: `\`\`\`${productName}\`\`\``,
              inline: true,
            },
            {
              name: "ราคา",
              value: `\`\`\`${productPrice / 100} บาท\`\`\``,
              inline: true,
            },
            {
              name: "ยอดเงินก่อนซื้อ",
              value: `\`\`\`${initialUserMoney} บาท\`\`\``,
              inline: true,
            },
            {
              name: "ยอดเงินหลังซื้อ (ถ้าถูกหัก)",
              value: `\`\`\`${(userMoney - productPrice) / 100} บาท\`\`\``,
              inline: true,
            },
            {
              name: "รายละเอียดข้อผิดพลาด",
              value: `\`\`\`${error.message}\`\`\``,
              inline: false,
            },
          ],
          footer: {
            text: "ระบบการจัดการสินค้า",
          },
          timestamp: new Date(),
        },
      ],
    }).catch(discordError => {
      console.error("Error sending error notification to Discord:", discordError);
    });

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
  const { userId, reward, type } = req.body;

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

  if (!userId || !commentId) {
    return res.status(400).json({ type: "error", message: "ข้อมูลไม่ครบถ้วน" });
  }

  try {
    const [userResults] = await db
      .promise()
      .query("SELECT * FROM users WHERE id = ?", [userId]);
    if (userResults.length === 0) {
      return res.status(404).json({ type: "error", message: "ไม่พบผู้ใช้" });
    }

    const [likeResults] = await db
      .promise()
      .query("SELECT * FROM likecomment WHERE user_id = ? AND comment_id = ?", [userId, commentId]);

    if (likeResults.length > 0) {
      return res.status(409).json({
        type: "warning",
        message: "คุณได้กดไลค์ในคอมเมนต์นี้แล้ว",
      });
    }

    // เพิ่มไลค์
    await db
      .promise()
      .query(
        "INSERT INTO likecomment (user_id, comment_id) VALUES (?, ?)",
        [userId, commentId]
      );

    return res.status(201).json({
      type: "success",
      message: "กดไลค์สำเร็จ",
    });

  } catch (error) {
    console.error("Error in /addLike:", error);

    return res.status(500).json({
      type: "error",
      message: "กดไลค์ไม่สำเร็จ",
    });
  }
});


app.post("/removeLike", async (req, res) => {
  const { userId, commentId } = req.body;

  // ตรวจสอบข้อมูลที่รับเข้ามา
  if (!userId || !commentId) {
    return res.status(400).json({ type: "error", message: "ข้อมูลไม่ครบถ้วน" });
  }

  try {
    const [userResults] = await db
      .promise()
      .query("SELECT * FROM users WHERE id = ?", [userId]);
    if (userResults.length === 0) {
      return res.status(404).json({ type: "error", message: "ไม่พบผู้ใช้" });
    }

    const [likeResults] = await db
      .promise()
      .query("SELECT * FROM likecomment WHERE user_id = ? AND comment_id = ?", [userId, commentId]);

    if (likeResults.length === 0) {
      return res.status(404).json({
        type: "warning",
        message: "ไม่พบไลค์ที่ต้องการลบ",
      });
    }

    // ลบไลค์
    await db
      .promise()
      .query(
        "DELETE FROM likecomment WHERE user_id = ? AND comment_id = ?",
        [userId, commentId]
      );

    return res.status(200).json({
      type: "success",
      message: "เอาไลค์ออกสำเร็จ",
    });

  } catch (error) {
    console.error("Error in /removeLike:", error);

    return res.status(500).json({
      type: "error",
      message: "เกิดข้อผิดพลาดในการลบไลค์",
    });
  }
});



/* Admin */

const crypto = require('crypto');

app.post("/editwebsite", async (req, res) => {
  const {
    name,
    logo,
    description,
    color1,
    color2,
    color3,
    color4,
    color5,
    imageBg,
  } = req.body;

  try {
    db.query("SELECT * FROM website WHERE id = 1", (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ type: "error", message: "มีข้อผิดพลาดในการดึงข้อมูล" });
      }

      const currentData = results[0];

      const updatedName = name || currentData.name;
      const updatedLogo = logo || currentData.logo;
      const updatedDescription = description || currentData.description;
      const updatedColor1 = color1 || currentData.color_primary;
      const updatedColor2 = color2 || currentData.color_secondary;
      const updatedColor3 = color3 || currentData.color_text;
      const updatedColor4 = color4 || currentData.color_button;
      const updatedColor5 = color5 || currentData.color_bg;
      const updatedImageBg = imageBg || currentData.image_bg;

      db.query(
        "UPDATE website SET name = ?, logo = ?, description = ?, color_primary = ?, color_secondary = ?, color_text = ?, color_button = ?, color_bg = ?, image_bg = ? WHERE id = 1",
        [
          updatedName,
          updatedLogo,
          updatedDescription,
          updatedColor1,
          updatedColor2,
          updatedColor3,
          updatedColor4,
          updatedColor5,
          updatedImageBg,
        ],
        (error, results) => {
          if (error) {
            console.error(error);
            return res.status(500).json({ type: "error", message: "มีข้อผิดพลาดเกิดขึ้น" });
          }

          return res.status(200).json({ type: "success", message: "อัปเดตข้อมูลสำเร็จ" });
        }
      );
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ type: "error", message: "เกิดข้อผิดพลาดในการอัปเดตข้อมูลเว็บไซต์" });
  }
});



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
      "INSERT INTO products (product_id, image1, image2, image3, image4, image5, image6, title, detail, category, price, recommend, status) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
        recommendProduct,
        status,
      ],
      (error, results) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ type: "error", message: "มีข้อผิดพลาดเกิดขึ้น" });
        }

        db.query(
          "INSERT INTO data (product_id, username, password) VALUES (?, ?, ?)",
          [productId, username, password],
          (error, results) => {
            if (error) {
              console.error(error);
              return res.status(500).json({ type: "error", message: "มีข้อผิดพลาดเกิดขึ้น" });
            }

            return res.status(201).json({ type: "success", message: "เพิ่มสินค้าเสร็จสิ้น" });
          }
        );
      }
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ type: "error", message: "เกิดข้อผิดพลาดในการเพิ่มสินค้า" });
  }
});

app.post("/update-product", async (req, res) => {
  const {
    productId,
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
    recommendProduct,
  } = req.body;

  try {
    db.query(
      "UPDATE products SET title = ?, detail = ?, category = ?, price = ?, image1 = ?, image2 = ?, image3 = ?, image4 = ?, image5 = ?, image6 = ?, status = ?, recommend = ? WHERE product_id = ?",
      [
        title,
        detail,
        category,
        price,
        image1,
        image2,
        image3,
        image4,
        image5,
        image6,
        status,
        recommendProduct,
        productId,
      ],
      (error, results) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ type: "error", message: "มีข้อผิดพลาดเกิดขึ้น" });
        }

        if (username || password) {
          db.query(
            "UPDATE data SET username = ?, password = ? WHERE product_id = ?",
            [username, password, productId],
            (error, results) => {
              if (error) {
                console.error(error);
                return res.status(500).json({ type: "error", message: "มีข้อผิดพลาดเกิดขึ้น" });
              }

              return res.status(200).json({ type: "success", message: "อัพเดตสินค้าสำเร็จ" });
            }
          );
        } else {
          return res.status(200).json({ type: "success", message: "อัพเดตสินค้าสำเร็จ" });
        }
      }
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ type: "error", message: "เกิดข้อผิดพลาดในการอัพเดตสินค้า" });
  }
});



app.post("/delete-product", async (req, res) => {
  const { productId } = req.body;

  try {
    if (!productId) {
      return res.status(400).json({
        type: "error", message: "โปรดกรอกข้อมูลที่จำเป็นให้ครบ",
      });
    }

    db.query(
      "DELETE FROM data WHERE id = ?",
      [productId],
      (error, results) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ type: "error", message: "มีข้อผิดพลาดเกิดขึ้น" });
        }
        db.query(
          "DELETE FROM products WHERE id = ?",
          [productId],
          (error, results) => {
            if (error) {
              console.error(error);
              return res.status(500).json({ type: "error", message: "มีข้อผิดพลาดเกิดขึ้น" });
            }
            return res.status(201).json({ type: "success", message: "ลบสินค้าเสร็จสิ้น" });
          }
        );
      }
    );


  } catch (error) {
    console.error(error);
    return res.status(500).json({ type: "error", message: "เกิดข้อผิดพลาดในการเพิ่มสินค้า" });
  }
});


app.post("/add-category", async (req, res) => {
  const {
    name,
    image,
    status,
  } = req.body;

  try {
    if (!name || !image) {
      return res.status(400).json({
        message: "โปรดกรอกข้อมูลที่จำเป็นให้ครบ",
      });
    }

    db.query(
      "INSERT INTO category (name, image, status) VALUES ( ?, ?, ?)",
      [
        name,
        image,
        status,
      ],
      (error, results) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ type: "error", message: "มีข้อผิดพลาดเกิดขึ้น" });
        }
        return res.status(201).json({ type: "ssuccess", message: "เพิ่มหมวดหมู่เสร็จสิ้น" });
      }
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ type: "error", message: "เกิดข้อผิดพลาดในการเพิ่มหมวดหมู่" });
  }
});

app.post("/update-category", async (req, res) => {
  const { categoryId, name, image, status } = req.body;

  try {
    db.query("SELECT * FROM category WHERE id = ?", [categoryId], (error, results) => {
      if (error || results.length === 0) {
        return res.status(500).json({ type: "error", message: "ไม่พบหมวดหมู่หรือเกิดข้อผิดพลาด" });
      }

      const currentCategory = results[0];
      const updateFields = [];
      const updateValues = [];

      if (name && name !== currentCategory.name) {
        updateFields.push("name = ?");
        updateValues.push(name);
      }
      if (image && image !== currentCategory.image) {
        updateFields.push("image = ?");
        updateValues.push(image);
      }
      if (status !== undefined && status !== currentCategory.status) {
        updateFields.push("status = ?");
        updateValues.push(status);
      }

      if (updateFields.length > 0) {
        updateValues.push(categoryId);
        const updateQuery = `UPDATE category SET ${updateFields.join(", ")} WHERE id = ?`;
        db.query(updateQuery, updateValues, (updateError) => {
          if (updateError) {
            return res.status(500).json({ type: "error", message: "เกิดข้อผิดพลาดในการอัพเดตหมวดหมู่" });
          }
          return res.status(200).json({ type: "success", message: "อัพเดตหมวดหมู่เสร็จสิ้น" });
        });
      } else {
        return res.status(200).json({ type: "info", message: "ไม่มีการเปลี่ยนแปลงข้อมูลหมวดหมู่" });
      }
    });
  } catch (error) {
    return res.status(500).json({ type: "error", message: "เกิดข้อผิดพลาดในการอัพเดตหมวดหมู่" });
  }
});

app.post("/delete-category", async (req, res) => {
  const { categoryId } = req.body;

  try {
    if (!categoryId) {
      return res.status(400).json({
        message: "โปรดกรอกข้อมูลที่จำเป็นให้ครบ",
      });
    }

    db.query(
      "DELETE FROM category WHERE id = ?",
      [categoryId],
      (error, results) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: "มีข้อผิดพลาดเกิดขึ้น" });
        }
        return res.status(201).json({ message: "ลบหมวดหมู่เสร็จสิ้น" });
      }
    );


  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบหมวดหมู่" });
  }
});

app.post("/add-event", async (req, res) => {
  const {
    title,
    image,
    status,
  } = req.body;

  try {
    if (!title || !image) {
      return res.status(400).json({
        message: "โปรดกรอกข้อมูลที่จำเป็นให้ครบ",
      });
    }

    db.query(
      "INSERT INTO events (title, image, status) VALUES ( ?, ?, ?)",
      [
        title,
        image,
        status,
      ],
      (error, results) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ type: "error", message: "มีข้อผิดพลาดเกิดขึ้น" });
        }
        return res.status(201).json({ type: "ssuccess", message: "เพิ่มกิจกรรมเสร็จสิ้น" });
      }
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ type: "error", message: "เกิดข้อผิดพลาดในการเพิ่มกิจกรรม" });
  }
});

app.post("/update-event", async (req, res) => {
  const { eventId, title, image, status } = req.body;

  try {
    db.query("SELECT * FROM events WHERE id = ?", [eventId], (error, results) => {
      if (error || results.length === 0) {
        return res.status(500).json({ type: "error", message: "ไม่พบกิจกรรมหรือเกิดข้อผิดพลาด" });
      }

      const currentEvent = results[0];
      const updateFields = [];
      const updateValues = [];

      if (title && title !== currentEvent.title) {
        updateFields.push("title = ?");
        updateValues.push(title);
      }
      if (image && image !== currentEvent.image) {
        updateFields.push("image = ?");
        updateValues.push(image);
      }
      if (status !== undefined && status !== currentEvent.status) {
        updateFields.push("status = ?");
        updateValues.push(status);
      }

      if (updateFields.length > 0) {
        updateValues.push(eventId);
        const updateQuery = `UPDATE events SET ${updateFields.join(", ")} WHERE id = ?`;
        db.query(updateQuery, updateValues, (updateError) => {
          if (updateError) {
            return res.status(500).json({ type: "error", message: "เกิดข้อผิดพลาดในการอัพเดตกิจกรรม" });
          }
          return res.status(200).json({ type: "success", message: "อัพเดตกิจกรรมเสร็จสิ้น" });
        });
      } else {
        return res.status(200).json({ type: "info", message: "ไม่มีการเปลี่ยนแปลงข้อมูลกิจกรรม" });
      }
    });
  } catch (error) {
    return res.status(500).json({ type: "error", message: "เกิดข้อผิดพลาดในการอัพเดตกิจกรรม" });
  }
});

app.post("/delete-event", async (req, res) => {
  const { eventId } = req.body;

  try {
    if (!eventId) {
      return res.status(400).json({
        message: "โปรดกรอกข้อมูลที่จำเป็นให้ครบ",
      });
    }

    db.query(
      "DELETE FROM events WHERE id = ?",
      [eventId],
      (error, results) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: "มีข้อผิดพลาดเกิดขึ้น" });
        }
        return res.status(201).json({ message: "ลบกิจกรรมเสร็จสิ้น" });
      }
    );

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบกิจกรรม" });
  }
});

app.post("/add-topup-game", async (req, res) => {
  const {
    title,
    detail,
    image,
    imageReward,
    banner,
    reward,
    select1,
    select2,
    select3,
    select4,
    select5,
    select6,
    select7,
    select8,
    price1,
    price2,
    price3,
    price4,
    price5,
    price6,
    price7,
    price8,
    status,
  } = req.body;

  try {
    if (!title || !image) {
      return res.status(400).json({
        message: "โปรดกรอกข้อมูลที่จำเป็นให้ครบ",
      });
    }

    const nameurl = title.toLowerCase().replace(/\s+/g, ''); // แปลง title เป็นตัวพิมพ์เล็กและลบช่องว่าง

    db.query(
      `INSERT INTO topupgame 
      (title, detail, image, image_reward, banner, reward, select1, select2, select3, select4, select5, select6, select7, select8, price1, price2, price3, price4, price5, price6, price7, price8, status, nameurl) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, detail, image, imageReward, banner, reward, select1, select2, select3, select4, select5, select6, select7, select8, price1, price2, price3, price4, price5, price6, price7, price8, status, nameurl],
      (error, results) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ type: "error", message: "มีข้อผิดพลาดเกิดขึ้น" });
        }
        return res.status(201).json({ type: "success", message: "เพิ่มกิจกรรมเสร็จสิ้น" });
      }
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ type: "error", message: "เกิดข้อผิดพลาดในการเพิ่มกิจกรรม" });
  }
});

app.post("/update-topup-game", async (req, res) => {
  const {
    TopupGameId,
    title,
    detail,
    image,
    imageReward,
    banner,
    reward,
    select1,
    select2,
    select3,
    select4,
    select5,
    select6,
    select7,
    select8,
    price1,
    price2,
    price3,
    price4,
    price5,
    price6,
    price7,
    price8,
    status
  } = req.body;

  try {
    db.query("SELECT * FROM topupgame WHERE id = ?", [TopupGameId], (error, results) => {
      if (error || results.length === 0) {
        return res.status(500).json({ type: "error", message: "ไม่พบกิจกรรมหรือเกิดข้อผิดพลาด" });
      }

      const currentTopupGame = results[0];
      const updateFields = [];
      const updateValues = [];

      if (title && title !== currentTopupGame.title) {
        updateFields.push("title = ?");
        updateValues.push(title);
        const nameurl = title.toLowerCase().replace(/\s+/g, '');
        updateFields.push("nameurl = ?");
        updateValues.push(nameurl);
      }
      if (detail && detail !== currentTopupGame.detail) {
        updateFields.push("detail = ?");
        updateValues.push(detail);
      }
      if (image && image !== currentTopupGame.image) {
        updateFields.push("image = ?");
        updateValues.push(image);
      }
      if (imageReward && imageReward !== currentTopupGame.imageReward) {
        updateFields.push("image_reward = ?");
        updateValues.push(imageReward);
      }
      if (banner && banner !== currentTopupGame.banner) {
        updateFields.push("banner = ?");
        updateValues.push(banner);
      }
      if (reward && reward !== currentTopupGame.reward) {
        updateFields.push("reward = ?");
        updateValues.push(reward);
      }
      if (select1 && select1 !== currentTopupGame.select1) {
        updateFields.push("select1 = ?");
        updateValues.push(select1);
      }
      if (select2 && select2 !== currentTopupGame.select2) {
        updateFields.push("select2 = ?");
        updateValues.push(select2);
      }
      if (select3 && select3 !== currentTopupGame.select3) {
        updateFields.push("select3 = ?");
        updateValues.push(select3);
      }
      if (select4 && select4 !== currentTopupGame.select4) {
        updateFields.push("select4 = ?");
        updateValues.push(select4);
      }
      if (select5 && select5 !== currentTopupGame.select5) {
        updateFields.push("select5 = ?");
        updateValues.push(select5);
      }
      if (select6 && select6 !== currentTopupGame.select6) {
        updateFields.push("select6 = ?");
        updateValues.push(select6);
      }
      if (select7 && select7 !== currentTopupGame.select7) {
        updateFields.push("select7 = ?");
        updateValues.push(select7);
      }
      if (select8 && select8 !== currentTopupGame.select8) {
        updateFields.push("select8 = ?");
        updateValues.push(select8);
      }
      if (price1 && price1 !== currentTopupGame.price1) {
        updateFields.push("price1 = ?");
        updateValues.push(price1);
      }
      if (price2 && price2 !== currentTopupGame.price2) {
        updateFields.push("price2 = ?");
        updateValues.push(price2);
      }
      if (price3 && price3 !== currentTopupGame.price3) {
        updateFields.push("price3 = ?");
        updateValues.push(price3);
      }
      if (price4 && price4 !== currentTopupGame.price4) {
        updateFields.push("price4 = ?");
        updateValues.push(price4);
      }
      if (price5 && price5 !== currentTopupGame.price5) {
        updateFields.push("price5 = ?");
        updateValues.push(price5);
      }
      if (price6 && price6 !== currentTopupGame.price6) {
        updateFields.push("price6 = ?");
        updateValues.push(price6);
      }
      if (price7 && price7 !== currentTopupGame.price7) {
        updateFields.push("price7 = ?");
        updateValues.push(price7);
      }
      if (price8 && price8 !== currentTopupGame.price8) {
        updateFields.push("price8 = ?");
        updateValues.push(price8);
      }
      if (status !== undefined && status !== currentTopupGame.status) {
        updateFields.push("status = ?");
        updateValues.push(status);
      }

      if (updateFields.length > 0) {
        updateValues.push(TopupGameId);
        const updateQuery = `UPDATE topupgame SET ${updateFields.join(", ")} WHERE id = ?`;
        db.query(updateQuery, updateValues, (updateError) => {
          if (updateError) {
            return res.status(500).json({ type: "error", message: "เกิดข้อผิดพลาดในการอัพเดตกิจกรรม" });
          }
          return res.status(200).json({ type: "success", message: "อัพเดตกิจกรรมเสร็จสิ้น" });
        });
      } else {
        return res.status(200).json({ type: "info", message: "ไม่มีการเปลี่ยนแปลงข้อมูลกิจกรรม" });
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ type: "error", message: "เกิดข้อผิดพลาดในการอัพเดตกิจกรรม" });
  }
});

app.post("/delete-topup-game", async (req, res) => {
  const { TopupGameId } = req.body;

  try {
    if (!TopupGameId) {
      return res.status(400).json({
        message: "โปรดกรอกข้อมูลที่จำเป็นให้ครบ",
      });
    }

    db.query(
      "DELETE FROM topupgame WHERE id = ?",
      [TopupGameId],
      (error, results) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: "มีข้อผิดพลาดเกิดขึ้น" });
        }
        return res.status(201).json({ message: "ลบกิจกรรมเสร็จสิ้น" });
      }
    );

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบกิจกรรม" });
  }
});

app.post("/add-user", async (req, res) => {
  const {
    username,
    email,
    urole,
    money,
  } = req.body;

  const password = 1234;

  try {
    if (!username || !email) {
      return res.status(400).json({
        message: "โปรดกรอกข้อมูลที่จำเป็นให้ครบ",
      });
    }

    db.query(
      "INSERT INTO users (username, email, password, money, urole) VALUES ( ?, ?, ?, ?, ?)",
      [
        username,
        email,
        password,
        money,
        urole,
      ],
      (error, results) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ type: "error", message: "มีข้อผิดพลาดเกิดขึ้น" });
        }
        return res.status(201).json({ type: "ssuccess", message: "เพิ่มผู้ใช้เสร็จสิ้น" });
      }
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ type: "error", message: "เกิดข้อผิดพลาดในการเพิ่มผู้ใช้" });
  }
});

app.post("/update-user", async (req, res) => {
  const { userId, username, email, password, money, urole } = req.body;

  try {
    db.query("SELECT * FROM users WHERE id = ?", [userId], (error, results) => {
      if (error || results.length === 0) {
        return res.status(500).json({ type: "error", message: "ไม่พบผู้ใช้หรือเกิดข้อผิดพลาด" });
      }

      const currentUser = results[0];
      const updateFields = [];
      const updateValues = [];

      if (username && username !== currentUser.username) {
        updateFields.push("username = ?");
        updateValues.push(username);
      }
      if (email && email !== currentUser.email) {
        updateFields.push("email = ?");
        updateValues.push(email);
      }
      if (password && password !== currentUser.password) {
        updateFields.push("password = ?");
        updateValues.push(password);
      }
      if (money !== undefined && money !== currentUser.money) {
        updateFields.push("money = ?");
        updateValues.push(money);
      }
      if (urole && urole !== currentUser.urole) {
        updateFields.push("urole = ?");
        updateValues.push(urole);
      }

      if (updateFields.length > 0) {
        updateValues.push(userId);
        const updateQuery = `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`;
        db.query(updateQuery, updateValues, (updateError) => {
          if (updateError) {
            return res.status(500).json({ type: "error", message: "เกิดข้อผิดพลาดในการอัพเดตผู้ใช้" });
          }
          return res.status(200).json({ type: "success", message: "อัพเดตผู้ใช้เสร็จสิ้น" });
        });
      } else {
        return res.status(200).json({ type: "info", message: "ไม่มีการเปลี่ยนแปลงข้อมูลผู้ใช้" });
      }
    });
  } catch (error) {
    return res.status(500).json({ type: "error", message: "เกิดข้อผิดพลาดในการอัพเดตผู้ใช้" });
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

const { Client, IntentsBitField, PermissionsBitField } = require('discord.js');
const { EmbedBuilder } = require('@discordjs/builders');

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

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});