let chatName = '';

document.addEventListener("DOMContentLoaded", () => {
      const startBtn = document.getElementById("startChatBtn");
      const nameInput = document.getElementById("chatNameInput");

      startBtn.addEventListener("click", async () => {
            const name = nameInput.value.trim();
            if (!name) {
                  alert("אנא תן שם לצ'אט");
                  return;
            }

            chatName = name;

            try {
                  // בודק אם כבר קיים צ'אט בשם הזה בשרת
                  const checkRes = await fetch("http://localhost:3000/chats");
                  if (!checkRes.ok) throw new Error("שגיאה בשרת");
                  const existingChats = await checkRes.json(); // מצפה למבנה [{ name: "צאט 1" }, { name: "צאט 2" }]

                  const chatExists = existingChats.some(c => c.name === chatName);

                  if (!chatExists) {
                        // יצירת צ'אט חדש עם הודעת פתיחה
                        const openingMessage = `שלום! אני העוזר החכם שלך ליצירת דמ״צים.\n\nאיך אני יכול לעזור לך היום? אתה יכול לבקש ממני:\n• ליצור טופס בדיקת רכב\n• לעצב טופס דיווח תקלות\n• להכין טופס בטיחות\n• או כל טופס אחר שאתה צריך!`;

                        const response = await fetch("http://localhost:3000/save", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                    chat: chatName,
                                    sender: "AI",
                                    text: openingMessage
                              })
                        });

                        if (!response.ok) throw new Error("שגיאת שרת");
                        console.log("✅ נוצר צ'אט חדש בשרת:", chatName);
                  } else {
                        console.log("ℹ️ צ'אט בשם הזה כבר קיים:", chatName);
                  }

                  // שמירה ב-localStorage + מעבר לצ'אט
                  localStorage.setItem("activeChatName", chatName);
                  window.location.href = `./src/chat.html?chat=${encodeURIComponent(chatName)}`;

            } catch (err) {
                  console.error("❌ שגיאה ביצירת/בדיקת צ'אט:", err);
                  alert("לא הצלחנו לבדוק או ליצור את הצ'אט, נסה שוב.");
            }
      });
});

