require("dotenv").config();

const { Telegraf, Markup } = require("telegraf");
const { analyzeCandidate } = require("./services/aiService");

const bot = new Telegraf(process.env.BOT_TOKEN);

const users = {};
const allUserIds = new Set();

const positions = [
  "Sotuv manageri",
  "Call center",
  "SMM",
  "Mobilograf",
  "Oshpaz",
  "Tozalik xodimasi",
  "Shofyor-gruzchik",
];

function isAdmin(ctx) {
  return String(ctx.from.id) === String(process.env.SUPER_ADMIN_ID);
}

function saveUser(ctx) {
  allUserIds.add(ctx.from.id);
}

bot.start((ctx) => {
  saveUser(ctx);

  const userId = ctx.from.id;

  users[userId] = {
    step: "position",
  };

  return ctx.reply(
    "Assalomu alaykum 😊\n\nDigi World HR botiga xush kelibsiz!\nQaysi vakansiyaga ariza topshirmoqchisiz?",
    Markup.keyboard([
      ["Sotuv manageri", "Call center"],
      ["SMM", "Mobilograf"],
      ["Oshpaz", "Tozalik xodimasi"],
      ["Shofyor-gruzchik"],
    ]).resize()
  );
});

bot.command("admin", (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply("Sizda admin huquqi yo‘q.");
  }

  users[ctx.from.id] = {
    step: "admin",
  };

  return ctx.reply(
    "Admin panel:",
    Markup.keyboard([
      ["📢 Xabar yuborish"],
      ["👥 Userlar soni"],
      ["⬅️ Chiqish"],
    ]).resize()
  );
});

bot.on("contact", (ctx) => {
  saveUser(ctx);

  const userId = ctx.from.id;

  if (!users[userId]) {
    return ctx.reply("Iltimos /start bosing.");
  }

  const user = users[userId];

  if (user.step !== "phone") {
    return ctx.reply("Hozir telefon raqam kerak emas 😊");
  }

  user.phone = ctx.message.contact.phone_number;

  if (user.position === "Shofyor-gruzchik") {
    user.step = "driverLicense";
    return ctx.reply("Prava kategoriyangizni yozing.\n\nMasalan: B, C yoki BC");
  }

  user.step = "age";
  return ctx.reply("Yoshingiz nechida?");
});

bot.on("video", async (ctx) => {
  saveUser(ctx);

  const userId = ctx.from.id;

  if (!users[userId]) {
    return ctx.reply("Iltimos /start bosing.");
  }

  const user = users[userId];

  if (user.step !== "video") {
    return ctx.reply("Hozir video kerak emas 😊");
  }

  user.videoFileId = ctx.message.video.file_id;
  user.step = "done";
  user.status = "New";

  await ctx.reply("Arizangiz tahlil qilinmoqda... ⏳");

  try {
    const aiResult = await analyzeCandidate(user);
    user.score = aiResult.score || "Noma’lum";
    user.aiSummary = aiResult.summary || "AI summary qaytmadi.";
  } catch (error) {
    console.error("AI ERROR:", error.message);
    user.score = "AI xatolik";
    user.aiSummary = "AI tahlil vaqtida xatolik yuz berdi. HR qo‘lda ko‘rib chiqishi kerak.";
  }

  let candidateText = "";

  if (user.position === "Shofyor-gruzchik") {
    candidateText = `🧑 Yangi kandidat

📌 Vakansiya:
${user.position}

👤 Ism:
${user.fullName}

🎂 Tug‘ilgan sana:
${user.birthDate}

📍 Manzil:
${user.address}

📞 Telefon:
${user.phone}

🚘 Prava kategoriya:
${user.driverLicense}

🏥 Sog‘liqdagi muammo:
${user.healthIssue}

🏢 Oldingi ish joyi:
${user.previousJob}

⭐ AI Score:
${user.score}/100

🧠 AI Summary:
${user.aiSummary}

📌 Status:
${user.status}`;
  } else {
    candidateText = `🧑 Yangi kandidat

📌 Vakansiya:
${user.position}

👤 Ism:
${user.fullName}

📞 Telefon:
${user.phone}

🎂 Yosh:
${user.age}

📍 Hudud:
${user.city}

💼 Tajriba:
${user.experience}

🏢 Oldingi ish joyi:
${user.previousJob}

🎯 Motivatsiya:
${user.motivation}

⭐ AI Score:
${user.score}/100

🧠 AI Summary:
${user.aiSummary}

📌 Status:
${user.status}`;
  }

  try {
    await bot.telegram.sendMessage(
      process.env.ADMIN_GROUP_ID,
      candidateText,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ Accept", `accept_${userId}`),
          Markup.button.callback("👀 Review", `review_${userId}`),
          Markup.button.callback("❌ Reject", `reject_${userId}`),
        ],
      ])
    );

    await bot.telegram.sendVideo(process.env.ADMIN_GROUP_ID, user.videoFileId, {
      caption: `🎥 ${user.fullName} video tanishtiruvi`,
    });
  } catch (error) {
    console.error("HR GROUP ERROR:", error.message);
    await ctx.reply("Ariza qabul qilindi, lekin HR group’ga yuborishda xatolik bo‘ldi. Admin tekshiradi.");
  }

  return ctx.reply(
    `✅ Arizangiz to‘liq qabul qilindi!

📌 Vakansiya: ${user.position}
👤 Ism: ${user.fullName}
📞 Telefon: ${user.phone}

Tez orada HR menejer siz bilan bog‘lanadi 😊`
  );
});

bot.action(/accept_(.+)/, async (ctx) => {
  const userId = ctx.match[1];

  if (!users[userId]) {
    await ctx.answerCbQuery("Kandidat topilmadi");
    return;
  }

  users[userId].status = "Accepted";
  await ctx.answerCbQuery("Accepted ✅");

  return ctx.reply(`✅ Kandidat qabul qilindi

👤 Ism: ${users[userId].fullName}
📌 Vakansiya: ${users[userId].position}
⭐ Score: ${users[userId].score}/100
📌 Status: Accepted`);
});

bot.action(/review_(.+)/, async (ctx) => {
  const userId = ctx.match[1];

  if (!users[userId]) {
    await ctx.answerCbQuery("Kandidat topilmadi");
    return;
  }

  users[userId].status = "Review";
  await ctx.answerCbQuery("Review 👀");

  return ctx.reply(`👀 Kandidat review holatiga o'tkazildi

👤 Ism: ${users[userId].fullName}
📌 Vakansiya: ${users[userId].position}
⭐ Score: ${users[userId].score}/100
📌 Status: Review`);
});

bot.action(/reject_(.+)/, async (ctx) => {
  const userId = ctx.match[1];

  if (!users[userId]) {
    await ctx.answerCbQuery("Kandidat topilmadi");
    return;
  }

  users[userId].status = "Rejected";
  await ctx.answerCbQuery("Rejected ❌");

  return ctx.reply(`❌ Kandidat rad etildi

👤 Ism: ${users[userId].fullName}
📌 Vakansiya: ${users[userId].position}
⭐ Score: ${users[userId].score}/100
📌 Status: Rejected`);
});

bot.on("text", async (ctx) => {
  saveUser(ctx);

  const userId = ctx.from.id;
  const text = ctx.message.text;

  if (!users[userId]) {
    return ctx.reply("Iltimos /start bosing.");
  }

  const user = users[userId];

  if (isAdmin(ctx) && text === "📢 Xabar yuborish") {
    user.step = "broadcast";
    return ctx.reply("Yubormoqchi bo‘lgan xabaringizni yozing:");
  }

  if (isAdmin(ctx) && text === "👥 Userlar soni") {
    return ctx.reply(`Bot foydalanuvchilari soni: ${allUserIds.size}`);
  }

  if (isAdmin(ctx) && text === "⬅️ Chiqish") {
    users[userId] = { step: "position" };
    return ctx.reply("Admin paneldan chiqdingiz. /start orqali davom eting.", Markup.removeKeyboard());
  }

  if (isAdmin(ctx) && user.step === "broadcast") {
    let success = 0;
    let failed = 0;

    for (const id of allUserIds) {
      try {
        await bot.telegram.sendMessage(id, text);
        success++;
      } catch (error) {
        failed++;
      }
    }

    user.step = "admin";

    return ctx.reply(`✅ Xabar yuborildi

Yetib bordi: ${success}
Xatolik: ${failed}`);
  }

  if (user.step === "position") {
    if (!positions.includes(text)) {
      return ctx.reply("Iltimos, pastdagi tugmalardan vakansiya tanlang.");
    }

    user.position = text;
    user.step = "fullName";

    return ctx.reply(`Siz tanladingiz: ${text} ✅\n\nEndi ism-familyangizni yozing.`);
  }

  if (user.step === "fullName") {
    user.fullName = text;

    if (user.position === "Shofyor-gruzchik") {
      user.step = "birthDate";
      return ctx.reply("Tug‘ilgan sanangizni yozing.\n\nMasalan: 12.05.1995");
    }

    user.step = "phone";

    return ctx.reply(
      "Telefon raqamingizni yuboring 📱",
      Markup.keyboard([[Markup.button.contactRequest("📞 Raqam yuborish")]]).resize()
    );
  }

  if (user.step === "birthDate") {
    user.birthDate = text;
    user.step = "address";
    return ctx.reply("Manzilingizni yozing.\n\nMasalan: Buxoro shahar, ...");
  }

  if (user.step === "address") {
    user.address = text;
    user.step = "phone";

    return ctx.reply(
      "Telefon raqamingizni yuboring 📱",
      Markup.keyboard([[Markup.button.contactRequest("📞 Raqam yuborish")]]).resize()
    );
  }

  if (user.step === "phone") {
    return ctx.reply("Iltimos, pastdagi 📞 Raqam yuborish tugmasini bosing.");
  }

  if (user.step === "age") {
    user.age = text;
    user.step = "city";
    return ctx.reply("Qaysi shahar yoki tumansiz?", Markup.removeKeyboard());
  }

  if (user.step === "city") {
    user.city = text;
    user.step = "experience";
    return ctx.reply("Ish tajribangiz haqida qisqacha yozing.\n\nMasalan: 2 yil sotuvda ishlaganman.");
  }

  if (user.step === "experience") {
    user.experience = text;
    user.step = "previousJob";
    return ctx.reply("Oldingi ish joyingiz qayer edi?\n\nAgar oldin ishlamagan bo‘lsangiz, “yo‘q” deb yozing.");
  }

  if (user.step === "driverLicense") {
    user.driverLicense = text;
    user.step = "healthIssue";
    return ctx.reply(
      "Sog‘ligingizda ishga ta’sir qilishi mumkin bo‘lgan muammo bormi?\n\nAgar yo‘q bo‘lsa, “yo‘q” deb yozing.",
      Markup.removeKeyboard()
    );
  }

  if (user.step === "healthIssue") {
    user.healthIssue = text;
    user.step = "previousJob";
    return ctx.reply("Bundan oldingi ish joyingiz qayer edi?\n\nAgar oldin ishlamagan bo‘lsangiz, “yo‘q” deb yozing.");
  }

  if (user.step === "previousJob") {
    user.previousJob = text;

    if (user.position === "Shofyor-gruzchik") {
      user.step = "video";

      return ctx.reply(
        "Endi o‘zingiz haqingizda 30–60 soniyalik video yuboring 🎥\n\nVideoda ayting:\n1. Ismingiz\n2. Prava kategoriyangiz\n3. Oldingi ish joyingiz\n4. Nega Digi World’da ishlamoqchisiz?"
      );
    }

    user.step = "motivation";
    return ctx.reply("Nega aynan Digi World’da ishlamoqchisiz?");
  }

  if (user.step === "motivation") {
    user.motivation = text;
    user.step = "video";

    return ctx.reply(
      "Endi o‘zingiz haqingizda 30–60 soniyalik video yuboring 🎥\n\nVideoda ayting:\n1. Ismingiz\n2. Qaysi vakansiyaga topshiryapsiz\n3. Tajribangiz\n4. Nega aynan Digi World’da ishlamoqchisiz?"
    );
  }

  if (user.step === "video") {
    return ctx.reply("Iltimos, video yuboring 🎥");
  }

  if (user.step === "done") {
    return ctx.reply("Sizning arizangiz allaqachon qabul qilingan ✅\n\nYangi ariza topshirish uchun /start bosing.");
  }
});

bot.launch();

console.log("Bot ishga tushdi ✅");