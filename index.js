require("dotenv").config();

const { Telegraf, Markup } = require("telegraf");
const { analyzeCandidate } = require("./services/aiService");

const bot = new Telegraf(process.env.BOT_TOKEN);

// VAQTINCHALIK USER DATABASE
const users = {};

// VAKANSIYALAR
const positions = [
  "Sotuv manageri",
  "Call center",
  "SMM",
  "Mobilograf",
  "Oshpaz",
  "Tozalik xodimasi",
  "Shofyor-gruzchik",
];

// START
bot.start((ctx) => {
  const userId = ctx.from.id;

  users[userId] = {
    step: "position",
  };

  ctx.reply(
    "Assalomu alaykum 😊\n\nDigi World HR botiga xush kelibsiz!\nQaysi vakansiyaga ariza topshirmoqchisiz?",
    Markup.keyboard([
      ["Sotuv manageri", "Call center"],
      ["SMM", "Mobilograf"],
      ["Oshpaz", "Tozalik xodimasi"],
      ["Shofyor-gruzchik"],
    ]).resize()
  );
});

// CONTACT HANDLER
bot.on("contact", (ctx) => {
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

// VIDEO HANDLER
bot.on("video", async (ctx) => {
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

    user.score = aiResult.score;
    user.aiSummary = aiResult.summary;
  } catch (error) {
    console.error("AI ERROR:", error.message);

    user.score = "AI xatolik";
    user.aiSummary =
      "AI tahlil vaqtida xatolik yuz berdi. HR qo‘lda ko‘rib chiqishi kerak.";
  }

  console.log("YANGI KANDIDAT:", user);

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

  return ctx.reply(
    `✅ Arizangiz to‘liq qabul qilindi!

📌 Vakansiya: ${user.position}
👤 Ism: ${user.fullName}
📞 Telefon: ${user.phone}

Tez orada HR menejer siz bilan bog‘lanadi 😊`
  );
});

// INLINE BUTTON: ACCEPT
bot.action(/accept_(.+)/, async (ctx) => {
  const userId = ctx.match[1];

  if (!users[userId]) {
    await ctx.answerCbQuery("Kandidat topilmadi");
    return;
  }

  users[userId].status = "Accepted";

  await ctx.answerCbQuery("Accepted ✅");

  return ctx.reply(
    `✅ Kandidat qabul qilindi

👤 Ism: ${users[userId].fullName}
📌 Vakansiya: ${users[userId].position}
⭐ Score: ${users[userId].score}/100
📌 Status: Accepted`
  );
});

// INLINE BUTTON: REVIEW
bot.action(/review_(.+)/, async (ctx) => {
  const userId = ctx.match[1];

  if (!users[userId]) {
    await ctx.answerCbQuery("Kandidat topilmadi");
    return;
  }

  users[userId].status = "Review";

  await ctx.answerCbQuery("Review 👀");

  return ctx.reply(
    `👀 Kandidat review holatiga o'tkazildi

👤 Ism: ${users[userId].fullName}
📌 Vakansiya: ${users[userId].position}
⭐ Score: ${users[userId].score}/100
📌 Status: Review`
  );
});

// INLINE BUTTON: REJECT
bot.action(/reject_(.+)/, async (ctx) => {
  const userId = ctx.match[1];

  if (!users[userId]) {
    await ctx.answerCbQuery("Kandidat topilmadi");
    return;
  }

  users[userId].status = "Rejected";

  await ctx.answerCbQuery("Rejected ❌");

  return ctx.reply(
    `❌ Kandidat rad etildi

👤 Ism: ${users[userId].fullName}
📌 Vakansiya: ${users[userId].position}
⭐ Score: ${users[userId].score}/100
📌 Status: Rejected`
  );
});

// TEXT HANDLER
bot.on("text", (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text;

  if (!users[userId]) {
    return ctx.reply("Iltimos /start bosing.");
  }

  const user = users[userId];

  // STEP: POSITION
  if (user.step === "position") {
    if (!positions.includes(text)) {
      return ctx.reply("Iltimos, pastdagi tugmalardan vakansiya tanlang.");
    }

    user.position = text;
    user.step = "fullName";

    return ctx.reply(
      `Siz tanladingiz: ${text} ✅\n\nEndi ism-familyangizni yozing.`
    );
  }

  // STEP: FULL NAME
  if (user.step === "fullName") {
    user.fullName = text;

    if (user.position === "Shofyor-gruzchik") {
      user.step = "birthDate";
      return ctx.reply("Tug‘ilgan sanangizni yozing.\n\nMasalan: 12.05.1995");
    }

    user.step = "phone";

    return ctx.reply(
      "Telefon raqamingizni yuboring 📱",
      Markup.keyboard([
        [Markup.button.contactRequest("📞 Raqam yuborish")],
      ]).resize()
    );
  }

  // DRIVER STEP: BIRTH DATE
  if (user.step === "birthDate") {
    user.birthDate = text;
    user.step = "address";

    return ctx.reply("Manzilingizni yozing.\n\nMasalan: Buxoro shahar, ...");
  }

  // DRIVER STEP: ADDRESS
  if (user.step === "address") {
    user.address = text;
    user.step = "phone";

    return ctx.reply(
      "Telefon raqamingizni yuboring 📱",
      Markup.keyboard([
        [Markup.button.contactRequest("📞 Raqam yuborish")],
      ]).resize()
    );
  }

  // STEP: PHONE
  if (user.step === "phone") {
    return ctx.reply("Iltimos, pastdagi 📞 Raqam yuborish tugmasini bosing.");
  }

  // NORMAL STEP: AGE
  if (user.step === "age") {
    user.age = text;
    user.step = "city";

    return ctx.reply("Qaysi shahar yoki tumansiz?", Markup.removeKeyboard());
  }

  // NORMAL STEP: CITY
  if (user.step === "city") {
    user.city = text;
    user.step = "experience";

    return ctx.reply(
      "Ish tajribangiz haqida qisqacha yozing.\n\nMasalan: 2 yil sotuvda ishlaganman."
    );
  }

  // NORMAL STEP: EXPERIENCE
  if (user.step === "experience") {
    user.experience = text;
    user.step = "previousJob";

    return ctx.reply(
      "Oldingi ish joyingiz qayer edi?\n\nAgar oldin ishlamagan bo‘lsangiz, “yo‘q” deb yozing."
    );
  }

  // DRIVER STEP: DRIVER LICENSE
  if (user.step === "driverLicense") {
    user.driverLicense = text;
    user.step = "healthIssue";

    return ctx.reply(
      "Sog‘ligingizda ishga ta’sir qilishi mumkin bo‘lgan muammo bormi?\n\nAgar yo‘q bo‘lsa, “yo‘q” deb yozing.",
      Markup.removeKeyboard()
    );
  }

  // DRIVER STEP: HEALTH ISSUE
  if (user.step === "healthIssue") {
    user.healthIssue = text;
    user.step = "previousJob";

    return ctx.reply(
      "Bundan oldingi ish joyingiz qayer edi?\n\nAgar oldin ishlamagan bo‘lsangiz, “yo‘q” deb yozing."
    );
  }

  // STEP: PREVIOUS JOB
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

  // NORMAL STEP: MOTIVATION
  if (user.step === "motivation") {
    user.motivation = text;
    user.step = "video";

    return ctx.reply(
      "Endi o‘zingiz haqingizda 30–60 soniyalik video yuboring 🎥\n\nVideoda ayting:\n1. Ismingiz\n2. Qaysi vakansiyaga topshiryapsiz\n3. Tajribangiz\n4. Nega aynan Digi World’da ishlamoqchisiz?"
    );
  }

  // STEP: VIDEO
  if (user.step === "video") {
    return ctx.reply("Iltimos, video yuboring 🎥");
  }

  // STEP: DONE
  if (user.step === "done") {
    return ctx.reply(
      "Sizning arizangiz allaqachon qabul qilingan ✅\n\nYangi ariza topshirish uchun /start bosing."
    );
  }
});

// BOTNI ISHGA TUSHIRISH
bot.launch();

console.log("Bot ishga tushdi ✅");