import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import fs from "fs";

const exportPrompt = ` קיבלת את כל ההודעות הקודמות מהצ’אט.
המטרה שלך: ליצור פלט סופי של טופס דמ״צ מוכן לשימוש.  

הנחיות:
1. עבור על כל ההודעות הקודמות וחלץ את כל התשובות שהמשתמש נתן.  
2. קח עבור כל סעיף את התשובה האחרונה בלבד (אם יש כמה תשובות).  
3. אם סעיף לא נענה – כתוב "—".  
4. נסח מחדש את התשובות בצורה מלאה, ברורה ורציפה.  
5. הצג את הפלט בשני חלקים:  

JSON לפי הפורמט הבא:
{
  "פתיח דמ״צ": "...",
  "כללי": "...",
  "רקע": "...",
  "פער מבצעי": "...",
  "הצורך המבצעי": "...",
  "מענה קיים": "...",
  "תנאים מגבלות ואילוצים": "..."
}

⚠️ חשוב: אל תשאל שאלות חדשות. הפלט שאתה מחזיר הוא סופי בלבד.
בנוסף אל תכלול שום הסברים או הערות, רק את ה-JSON.
`;
// ==== הצגת תאריך נוכחי ====

// ==== שם הצ׳אט ====
const chatTitle = document.getElementById("chatTitle");
chatTitle.textContent = localStorage.getItem("activeChatName") || "צ'אט ";

// ==== Sidebar ====
const button = document.getElementById('openSidebarBtn');
const sidebar = document.getElementById('mySidebar');
const formPreviewPanel = document.querySelector('.form-preview-panel');
const chatPanel = document.querySelector('.chat-panel');
const mainContent = document.querySelector('.main-content');


// פתיחת הסיידבר
openSidebarBtn.addEventListener('click', () => {
      sidebar.style.width = '250px';
      sidebar.classList.add('open');
      formPreviewPanel.classList.add('open');
      chatPanel.classList.add('shrunk');
      mainContent.style.marginLeft = '250px';
      button.style.display = 'none'; // הסתרת הכפתור
});

// סגירת הסיידבר (בתוך הסיידבר)
closeSidebarBtn.addEventListener('click', () => {
      sidebar.style.width = '0';
      sidebar.classList.remove('open');
      formPreviewPanel.classList.remove('open');
      chatPanel.classList.remove('shrunk');
      mainContent.style.marginLeft = '0';
      button.style.display = 'block'; // הצגת הכפתור מחדש
});
const newChatBtn = document.getElementById("newChatBtn");

newChatBtn.addEventListener("click", () => {
      window.location.href = '../index.html'; // מעבר לדף הבא
});





// שליחת הודעה על ידי הכפתור
document.getElementById("sendBtn").addEventListener("click", () => aiHelper.sendMessage());

// ==== Sidebar: טוען צ'אטים קודמים ==== 
// פונקציה לפתיחת צ'אט לפי שם
function openChat(chatName) {
      chatTitle.textContent = chatName;
      aiHelper.loadChat(chatName);

      // עדכון ה-URL ללא ריענון
      const newUrl = `${window.location.pathname}?chat=${encodeURIComponent(chatName)}`;
      history.replaceState({ chat: chatName }, "", newUrl); // replaceState כדי למנוע שכפול בהיסטוריה
}

async function loadPreviousChats() {
      try {
            const res = await fetch("http://localhost:3000/chats");
            const previousChats = await res.json(); // [{ name: 'צאט 1' }, { name: 'צאט 2' }]

            const container = document.getElementById("formLinks");
            container.innerHTML = "";

            previousChats.forEach(chat => {
                  const link = document.createElement("a");
                  link.href = "#";
                  link.textContent = chat.name;

                  link.addEventListener("click", () => {
                        openChat(chat.name);
                  });

                  container.appendChild(link);
                  container.appendChild(document.createElement("br"));
            });

            // בודק אם יש צ'אט ב-URL
            const params = new URLSearchParams(window.location.search);
            const chatNameFromURL = params.get("chat");

            if (chatNameFromURL) {
                  openChat(chatNameFromURL);
            } else if (previousChats.length) {
                  openChat(previousChats[0].name);
            }

      } catch (err) {
            console.error("שגיאה בטעינת צ'אטים קודמים:", err);
      }
}

document.addEventListener("DOMContentLoaded", async () => {
      const params = new URLSearchParams(window.location.search);
      let activeChat = params.get("chat") || localStorage.getItem("activeChatName");

      if (activeChat) {
            openChat(activeChat);
      }
});



// ====  כפתור יצוא קובץ  ====
const exportBtn = document.getElementById('exportWordBtn');

exportBtn.addEventListener('click', async () => {
      const chatName = chatTitle.textContent;
      if (!chatName) {
            alert("לא נבחר צ'אט לייצוא");
            return;
      }

      try {
            // שלב 1 – בקשה ל-AI שיחזיר JSON
            const aiResult = await AIInstructionsForExport();

            // JSON מה-AI מגיע כמחרוזת → נפרק אותו
            const jsonData = extractJson(aiResult);
            if (!jsonData) {
                  alert("❌ הפלט שהתקבל מה-AI לא בפורמט JSON תקין");
                  console.error(aiResult);
                  return;
            }

            // שלב 2 – יצירת מסמך Word
            const doc = await generateDmatsDoc(jsonData, chatName);

            // שלב 3 – הורדת הקובץ
            const buffer = await Packer.toBlob(doc);
            const url = window.URL.createObjectURL(buffer);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${chatName}.docx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

      } catch (err) {
            console.error(err);
            alert("אירעה שגיאה בייצוא הצ'אט");
      }
});


async function AIInstructionsForExport() {
      const messagesFromServer = await connectToServer(chatTitle.textContent) || [];

      const messagesForAI = [
            ...messagesFromServer,// פרומפט טמפלייט
            { role: "system", content: exportPrompt }
      ];

      try {
            const response = await fetch("http://localhost:11434/api/chat", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                        model: "gemma3:1b",
                        messages: messagesForAI,
                        stream: false
                  })
            });

            if (!response.ok) throw new Error(`שגיאה בשרת: ${response.status}`);
            const data = await response.json();
            return data.message?.content ?? "לא התקבלה תגובה מה-AI";

      } catch (error) {
            console.error("שגיאה בקריאת ה-AI:", error);
            return "הייתה בעיה בתקשורת עם השרת";
      }
}


// פונקציה שמקבלת JSON ומייצרת Word
async function generateDmatsDoc(jsonData, title = "טופס דמ״צ") {
      function createMainTitle(text) {
            return new Paragraph({
                  alignment: AlignmentType.CENTER, // כותרת ראשית במרכז
                  bidirectional: true,
                  children: [
                        new TextRun({
                              text,
                              bold: true,
                              font: "Arial",
                              size: 36, // 18pt
                              rightToLeft: true,
                        }),
                  ],
            });
      }

      function createSection(letter, sectionTitle, bodyText) {
            return [
                  // כותרת סעיף
                  new Paragraph({
                        alignment: AlignmentType.RIGHT, // יישור לימין
                        bidirectional: true,
                        children: [
                              new TextRun({
                                    text: `${letter}. ${sectionTitle}:`,
                                    bold: true,
                                    underline: {},
                                    font: "Arial",
                                    size: 28, // 14pt
                                    rightToLeft: true,
                              }),
                        ],
                  }),
                  // תוכן הסעיף
                  new Paragraph({
                        alignment: AlignmentType.RIGHT, // יישור לימין
                        bidirectional: true,
                        children: [
                              new TextRun({
                                    text: bodyText || "—",
                                    font: "Arial",
                                    size: 24, // 12pt
                                    rightToLeft: true,
                              }),
                        ],
                  }),
            ];
      }

      const hebrewLetters = ["א", "ב", "ג", "ד", "ה", "ו", "ז"];

      const mapping = [
            [hebrewLetters[0], "פתיח דמ״צ", jsonData["פתיח דמ״צ"]],
            [hebrewLetters[1], "כללי", jsonData["כללי"]],
            [hebrewLetters[2], "רקע", jsonData["רקע"]],
            [hebrewLetters[3], "פער מבצעי", jsonData["פער מבצעי"]],
            [hebrewLetters[4], "הצורך המבצעי", jsonData["הצורך המבצעי"]],
            [hebrewLetters[5], "מענה קיים", jsonData["מענה קיים"]],
            [hebrewLetters[6], "תנאים מגבלות ואילוצים", jsonData["תנאים מגבלות ואילוצים"]],
      ];

      return new Document({
            sections: [
                  {
                        properties: {
                              page: {
                                    margin: { top: 720, right: 720, bottom: 720, left: 720 },
                              },
                              rtl: true, // כיוון כללי למסמך
                        },
                        children: [
                              createMainTitle(title),
                              ...mapping.flatMap(([letter, sectionTitle, text]) =>
                                    createSection(letter, sectionTitle, text)
                              ),
                        ],
                  },
            ],
      });
}





function extractJson(text) {
      try {
            // מנסה למצוא תוכן בין ```json ... ```
            const match = text.match(/```json([\s\S]*?)```/);
            if (match) {
                  return JSON.parse(match[1].trim());
            }
            // אם אין סימונים, ננסה למצוא אובייקט { ... }
            const curlyMatch = text.match(/\{[\s\S]*\}/);
            if (curlyMatch) {
                  return JSON.parse(curlyMatch[0]);
            }
            // fallback - אולי זה כבר JSON
            return JSON.parse(text);
      } catch (e) {
            console.error("❌ לא הצלחתי לפרק JSON:", e, text);
            return null;
      }
}




// ==== חיבור כפתור Send ====
document.querySelector('.send-btn').addEventListener('click', () => aiHelper.sendMessage());

// ==== AI Helper ====
const prompt1 = `דמ״צ
אתה עוזר למשתמש לכתוב טופס דמ״צ לפי סדר ברור. המטרה שלך: לשאול שאלות, לקבל תשובות, ולבסוף ליצור טופס מלא ומסודר לפי הטמפלייט של דמ״צ.
כללי:

שאל שאלה אחת בלבד בכל פעם.
כל שאלה מנוסחת באופן ברור עם סימן שאלה בסוף.

סדר השאלות והמידע הנדרש מהמשתמש:

פתיח דמ״צ:
מה נושא הדמ״צ? [לדוגמה: רחפנים, רק״ם, הסוואה
]

כללי:
רקע על היחידה, הייעוד שלה ושימושיה/פעולותיה

רקע:
א. רקע על הפער
ב. הסבר להקשר רחב
ג. דוגמאות למקרים שבהם הפער התגלה
ד. הסבר מושגים במידת הצורך

פער מבצעי:
הסבר על הפער עצמו ומה הופך אותו לפער

הצורך המבצעי:
מה נדרש לגישור על הפער

מענה קיים:
אילו מענים קיימים (או "אין")
אם קיים מענה מיוחד ביחידה מסוימת או חברה אזרחית, פרט

תנאים, מגבלות ואילוצים:
פרמטרים שהפתרון חייב לכלול
פרמטרים שנחמד שיהיו
דוגמאות ספציפיות לדרישות טכניות או מבצעיות (משקל, מימדים, נפח, צבע, תקשורת, אנרגיה, זמן עבודה, מהירות ממשק משתמש, עמידות, התגברות על מכשולים)
`;


// ====== connectToServer ======
async function connectToServer(chatName) {
      try {
            const res = await fetch(`http://localhost:3000/chat/${chatName}`);
            const messages = await res.json();


            // המרה לפורמט שה-AI מצפה לו
            const aiMessages = messages.map(msg => ({
                  role: (msg.sender || 'user').toLowerCase() === 'ai' ? 'assistant' : 'user',
                  content: msg.text || ''
            })).filter(m => m.content.trim() !== ''); // מסנן הודעות ריקות

            return aiMessages;

      } catch (err) {
            console.error("שגיאה בטעינת צ'אט:", err);
            return [];
      }
}

// ====== getAIResponse ======
async function getAIResponse(userMessage, selectedPrompt = prompt1) {
      // טוען הודעות קיימות מהשרת
      const messagesFromServer = await connectToServer(chatTitle.textContent);

      // הוספת הודעת המשתמש הנוכחית
      const messagesForAI = [
            { role: 'system', content: selectedPrompt }, // פרומפט מערכת
            ...messagesFromServer,
            { role: 'user', content: userMessage }
      ];
      console.log("messages For AI:", messagesForAI);

      try {
            const response = await fetch("http://localhost:11434/api/chat", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                        model: "gemma3:1b",
                        messages: messagesForAI,
                        stream: false
                  })
            });

            if (!response.ok) throw new Error(`שגיאה בשרת: ${response.status}`);

            const data = await response.json();
            const aiMessage = data.message?.content?.trim() || "— לא התקבלה תגובה מה-AI —";

            // שמירה ב-localStorage
            try {
                  const answers = JSON.parse(localStorage.getItem("answers") || "{}");
                  const timestamp = new Date().toISOString();
                  answers[timestamp] = { question: userMessage, answer: aiMessage };
                  localStorage.setItem("answers", JSON.stringify(answers, null, 2));
            } catch (e) {
                  console.warn("לא הצלחתי לשמור ל-JSON:", e);
            }

            return aiMessage;

      } catch (error) {
            console.error("שגיאה בקריאת ה-AI:", error);
            return "הייתה בעיה בתקשורת עם השרת";
      }
}


// ==== HebrewFormAI: טעינת צ'אט ==== 
// כל רפרש נטען מחדש
class HebrewFormAI {
      constructor() {
            this.messageInput = document.getElementById('messageInput');
            this.chatMessages = document.getElementById('chatMessages');
            this.sendBtn = document.querySelector('.send-btn');
            this.typingIndicator = document.getElementById('typingIndicator');
            this.messages = [];
            this.res;
            this.message;

            loadPreviousChats(); // טוען את הצ'אטים מיד

            this.initListeners();

            // אם יש צ'אט פעיל ב-localStorage, טען אותו
            const savedChat = localStorage.getItem("activeChatName");
            if (savedChat) {
                  chatTitle.textContent = savedChat;
                  this.loadChat(savedChat);
            }

      }

      initListeners() {
            this.messageInput.addEventListener('keypress', e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        this.sendMessage();
                  }
            });

            this.messageInput.addEventListener('input', () => {
                  this.messageInput.style.height = 'auto';
                  this.messageInput.style.height = Math.min(this.messageInput.scrollHeight,
                        120) + 'px';
                  this.sendBtn.disabled = !this.messageInput.value.trim();
            });
      }

      async loadChat(chatName) {
            try {
                  const res = await fetch(`http://localhost:3000/chat/${chatName}`);
                  const message = await res.json();
                  //this.connectToServer(chatName);
                  this.chatMessages.innerHTML = ""; // מנקה הודעות ישנות

                  // מציג כל הודעה באמצעות addMessage
                  message.forEach(msg => {
                        const sender = msg.sender ?? "UNKNOWN";
                        const text = msg.text ?? "";
                        this.addMessage(text, sender, false); // לא שומרים שוב לשרת
                  });
            } catch (err) {
                  console.error("שגיאה בטעינת צ'אט:", err);
            }
      }

      addMessage(text, sender = 'ai', save = true) {
            const div = document.createElement('div');
            div.classList.add('message', sender.toLowerCase());
            div.innerHTML = text.replace(/\n/g, '<br>');
            this.chatMessages.appendChild(div);
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

            this.messages.push({
                  sender, text, time: new Date().toISOString()
            });

            if (save) this.saveMessageToServer(sender, text);

      }

      showTyping() {
            this.typingIndicator.style.display = 'block';
      }
      hideTyping() {
            this.typingIndicator.style.display = 'none';
      }

      async sendMessage(message = null) {
            const text = message || this.messageInput.value.trim();
            if (!text) return;

            this.addMessage(text, 'user');
            if (!message) this.messageInput.value = '';

            this.sendBtn.disabled = true;
            this.showTyping();

            try {
                  const aiResponse = await getAIResponse(text);
                  this.addMessage(aiResponse, 'ai');
            } catch (err) {
                  console.error(err);
                  this.addMessage('❌ שגיאה בתקשורת עם ה-AI', 'ai');
            } finally {
                  this.hideTyping();
                  this.sendBtn.disabled = false;
            }
      }

      async saveMessageToServer(user, content) {
            // אם אין תוכן, שמור הודעה ברירת מחדל או אל תשמור בכלל
            const safeContent = content?.trim() ? content : "— אין תוכן מה-AI —";
            try {
                  const response = await fetch("http://localhost:3000/save",
                        {
                              method: "POST",
                              headers: {
                                    "Content-Type": "application/json"
                              },
                              body: JSON.stringify({
                                    chat: chatTitle.textContent || 'צאט חדש',
                                    sender: user || 'UNKNOWN',
                                    text: safeContent
                              })
                        });
                  if (!response.ok) throw new Error("שגיאה בשרת");
            } catch (err) {
                  console.error("❌ שגיאה בשמירת הודעה לשרת:", err);
            }
      }
}
// ==== אתחול AI Helper ====
const aiHelper = new HebrewFormAI();

