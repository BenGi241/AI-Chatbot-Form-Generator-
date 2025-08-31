let chatName = '';

document.addEventListener("DOMContentLoaded", () => {
      const startBtn = document.getElementById("startChatBtn");
      const nameInput = document.getElementById("chatNameInput");

      startBtn.addEventListener("click", async () => {
            const name = nameInput.value.trim();
            if (name) {
                  localStorage.setItem("activeChatName", name);
                  chatName = name;
                  console.log("צ'אט חדש התחיל בשם:", chatName);

                  // יצירת צ'אט חדש בשרת עם הודעת פתיחה
                  try {
                        const openingMessage = `שלום! אני העוזר החכם שלך ליצירת דמ״צים.\n\nאיך אני יכול לעזור לך היום? אתה יכול לבקש ממני:\n• ליצור טופס בדיקת רכב\n• לעצב טופס דיווח תקלות\n• להכין טופס בטיחות\n• או כל טופס אחר שאתה צריך!`;

                        const response = await fetch("http://localhost:3000/save", {
                              method: "POST",
                              headers: {
                                    "Content-Type": "application/json"
                              },
                              body: JSON.stringify({
                                    chat: chatName,
                                    sender: "AI",
                                    text: openingMessage
                              })
                        });

                        if (!response.ok) throw new Error("שגיאת שרת");

                        // שמירה ב-localStorage (או ניתן גם ב-URL)
                        localStorage.setItem("activeChatName", chatName);
                        console.log("✅ נוצר צ'אט חדש בשרת:", chatName);

                        // מעבר לצ'אט עם פרמטר ב-URL
                        window.location.href = `./src/chat.html?chat=${encodeURIComponent(chatName)}`;

                  } catch (err) {
                        console.error("❌ שגיאה ביצירת צ'אט חדש:", err);
                        alert("לא הצלחנו ליצור את הצ'אט, נסה שוב.");
                  }
            } else {
                  alert("אנא תן שם לצ'אט");
            }
      });
});
