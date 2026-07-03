require("dotenv").config();

const { Telegraf, Markup } = require("telegraf");

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

const SALES_QUESTIONS = [
  { key: "birthDate", text: "Tug‘ilgan sanangizni yozing.\n\nMasalan: 12.05.1995" },
  { key: "address", text: "Manzilingizni yozing.\n\nMasalan: Buxoro shahar, ..." },
  { key: "familyStatus", text: "Oilaviy holatingiz?\n\nMasalan: uylangan / turmushga chiqqan / bo‘ydoq / turmushga chiqmagan" },
  { key: "childrenInfo", text: "Farzandlaringiz soni va yoshi?\n\nAgar yo‘q bo‘lsa, “yo‘q” deb yozing." },
  { key: "education", text: "Ta’limingiz?\n\nMasalan: oliy / o‘rta maxsus / tugallanmagan oliy" },
  { key: "speciality", text: "Mutaxassisligingiz nima?" },
  { key: "lastJob", text: "Oxirgi ishlagan joyingiz?" },
  { key: "lastPosition", text: "Oxirgi ish joyingizdagi lavozimingiz?" },
  { key: "yearsWorked", text: "U yerda necha yil ishlagansiz?" },
  { key: "leavingReason", text: "Ishdan ketish sababingiz?" },
  { key: "managementExperience", text: "Avval boshqaruv lavozimida ishlaganmisiz?\n\nHa yoki Yo‘q deb yozing." },
  { key: "managedEmployees", text: "Agar ha bo‘lsa, nechta xodimni boshqargansiz?\n\nAgar yo‘q bo‘lsa, “yo‘q” deb yozing." },
  { key: "maxMonthlySales", text: "Eng katta oylik sotuvingiz qancha bo‘lgan?" },
  { key: "avgMonthlySales", text: "O‘rtacha bir oyda qancha savdo qilgansiz?" },
  { key: "kpiExperience", text: "KPI bilan ishlaganmisiz?\n\nHa yoki Yo‘q deb yozing." },
  { key: "bonusExperience", text: "Bonus tizimida ishlaganmisiz?\n\nHa yoki Yo‘q deb yozing." },
  { key: "crmExperience", text: "Qaysi CRM/dasturlardan foydalangansiz?\n\nMasalan: Bitrix24, AmoCRM, 1C, Excel, boshqa yoki yo‘q" },
  { key: "stressCase", text: "Sizga bir vaqtda 15 ta mijoz, direktor, yetkazib beruvchi va telefon qo‘ng‘iroqlari murojaat qilsa nima qilasiz?" },
  { key: "lastStress", text: "Oxirgi marta qachon qattiq stress bo‘lgansiz va uni qanday yenggansiz?" },
  { key: "customerAlwaysRight", text: "Siz uchun mijoz doimo haqmi?\n\nHa yoki Yo‘q. Nima uchun?" },
  { key: "difficultClient", text: "Eng qiyin mijoz bilan qanday ishlaysiz?" },
  { key: "salesMetrics", text: "Savdoda eng muhim ko‘rsatkichlar qaysilar?\n\nMasalan: konversiya, o‘rtacha chek, trafik, qaytuvchi mijoz, foyda, marja" },
  { key: "kpiMeaning", text: "KPI nima? O‘z so‘zingiz bilan tushuntiring." },
  { key: "techKnowledge", text: "Maishiy texnika bo‘yicha bilimingizni 1 dan 5 gacha baholang va qisqa izoh yozing." },
  { key: "techConsult", text: "Konditsioner, kir yuvish mashinasi yoki muzlatgich haqida mijozga maslahat bera olasizmi?\n\nHa yoki Yo‘q. Misol bilan yozing." },
  { key: "cashHonesty", text: "Kassada 500 000 so‘m ortiqcha chiqdi. Nima qilasiz?" },
  { key: "friendTheft", text: "Eng yaxshi do‘stingiz do‘kondan mahsulotni ruxsatsiz olib chiqayotganini ko‘rdingiz. Nima qilasiz?" },
  { key: "lastBook", text: "Oxirgi o‘qigan kitobingiz?" },
  { key: "lastTraining", text: "Oxirgi qatnashgan treningingiz?" },
  { key: "mentor", text: "Kimni ustoz deb bilasiz?" },
  { key: "threeYearGoal", text: "3 yildan keyin o‘zingizni qayerda ko‘rasiz?" },
  { key: "whyDigiWorld", text: "Nima uchun aynan Digi World’da ishlamoqchisiz?" },
  { key: "whyHireYou", text: "Nima uchun sizni ishga olishimiz kerak?" },
];

function isAdmin(ctx) {
  return String(ctx.from.id) === String(process.env.SUPER_ADMIN_ID);
}

function saveUser(ctx) {
  if (ctx.from && ctx.from.id) allUserIds.add(ctx.from.id);
}

function mainKeyboard() {
  return Markup.keyboard([
    ["Sotuv manageri", "Call center"],
    ["SMM", "Mobilograf"],
    ["Oshpaz", "Tozalik xodimasi"],
    ["Shofyor-gruzchik"],
  ]).resize();
}

function adminKeyboard() {
  return Markup.keyboard([
    ["📢 Xabar yuborish"],
    ["👥 Userlar soni"],
    ["⬅️ Chiqish"],
  ]).resize();
}

function getSalesAnswersText(user) {
  return SALES_QUESTIONS.map((q, i) => `${i + 1}. ${q.text.split("\n")[0]}\n${user.salesAnswers?.[q.key] || "-"}`).join("\n\n");
}

async function sendCandidateToGroup(user, userId) {
  let candidateText = "";

  if (user.position === "Sotuv manageri") {
    candidateText = `🧑 Yangi kandidat

📌 Vakansiya:
${user.position}

👤 F.I.Sh:
${user.fullName}

📞 Telefon:
${user.phone}

📝 Anketa javoblari:

${getSalesAnswersText(user)}

📌 Status:
${user.status}`;
  } else if (user.position === "Shofyor-gruzchik") {
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

  if (user.videoFileId) {
    await bot.telegram.sendVideo(process.env.ADMIN_GROUP_ID, user.videoFileId, {
      caption: `🎥 ${user.fullName} video tanishtiruvi`,
    });
  }
}

bot.start((ctx) => {
  saveUser(ctx);
  const userId = ctx.from.id;
  users[userId] = { step: "position" };

  return ctx.reply(
    "Assalomu alaykum 😊\n\nDigi World HR botiga xush kelibsiz!\nQaysi vakansiyaga ariza topshirmoqchisiz?",
    mainKeyboard()
  );
});

bot.command("admin", (ctx) => {
  saveUser(ctx);

  if (!isAdmin(ctx)) return ctx.reply("Sizda admin huquqi yo‘q.");

  users[ctx.from.id] = { step: "admin" };
  return ctx.reply("Admin panel:", adminKeyboard());
});

bot.on("contact", (ctx) => {
  saveUser(ctx);
  const userId = ctx.from.id;

  if (!users[userId]) return ctx.reply("Iltimos /start bosing.");

  const user = users[userId];
  if (user.step !== "phone") return ctx.reply("Hozir telefon raqam kerak emas 😊");

  user.phone = ctx.message.contact.phone_number;

  if (user.position === "Sotuv manageri") {
    user.step = "salesQuestion";
    user.salesIndex = 0;
    user.salesAnswers = {};
    return ctx.reply(SALES_QUESTIONS[0].text, Markup.removeKeyboard());
  }

  if (user.position === "Shofyor-gruzchik") {
    user.step = "driverLicense";
    return ctx.reply("Prava kategoriyangizni yozing.\n\nMasalan: B, C yoki BC", Markup.removeKeyboard());
  }

  user.step = "age";
  return ctx.reply("Yoshingiz nechida?", Markup.removeKeyboard());
});

bot.on("video", async (ctx) => {
  saveUser(ctx);
  const userId = ctx.from.id;

  if (!users[userId]) return ctx.reply("Iltimos /start bosing.");

  const user = users[userId];
  if (user.step !== "video") return ctx.reply("Hozir video kerak emas 😊");

  user.videoFileId = ctx.message.video.file_id;
  user.step = "done";
  user.status = "New";

  try {
    await sendCandidateToGroup(user, userId);
  } catch (error) {
    console.error("HR GROUP ERROR:", error.message);
    return ctx.reply("Arizangiz qabul qilindi, lekin HR group’ga yuborishda xatolik bo‘ldi. Admin tekshiradi.");
  }

  return ctx.reply(`✅ Arizangiz to‘liq qabul qilindi!

📌 Vakansiya: ${user.position}
👤 Ism: ${user.fullName}
📞 Telefon: ${user.phone}

Tez orada HR menejer siz bilan bog‘lanadi 😊`);
});

bot.action(/accept_(.+)/, async (ctx) => {
  const userId = ctx.match[1];
  if (!users[userId]) return ctx.answerCbQuery("Kandidat topilmadi");
  users[userId].status = "Accepted";
  await ctx.answerCbQuery("Accepted ✅");
  return ctx.reply(`✅ Kandidat qabul qilindi\n\n👤 Ism: ${users[userId].fullName}\n📌 Vakansiya: ${users[userId].position}\n📌 Status: Accepted`);
});

bot.action(/review_(.+)/, async (ctx) => {
  const userId = ctx.match[1];
  if (!users[userId]) return ctx.answerCbQuery("Kandidat topilmadi");
  users[userId].status = "Review";
  await ctx.answerCbQuery("Review 👀");
  return ctx.reply(`👀 Kandidat review holatiga o'tkazildi\n\n👤 Ism: ${users[userId].fullName}\n📌 Vakansiya: ${users[userId].position}\n📌 Status: Review`);
});

bot.action(/reject_(.+)/, async (ctx) => {
  const userId = ctx.match[1];
  if (!users[userId]) return ctx.answerCbQuery("Kandidat topilmadi");
  users[userId].status = "Rejected";
  await ctx.answerCbQuery("Rejected ❌");
  return ctx.reply(`❌ Kandidat rad etildi\n\n👤 Ism: ${users[userId].fullName}\n📌 Vakansiya: ${users[userId].position}\n📌 Status: Rejected`);
});

bot.on("text", async (ctx) => {
  saveUser(ctx);
  const userId = ctx.from.id;
  const text = ctx.message.text;

  if (!users[userId]) return ctx.reply("Iltimos /start bosing.");
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
    return ctx.reply("Admin paneldan chiqdingiz.", Markup.removeKeyboard());
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
    return ctx.reply(`✅ Xabar yuborildi\n\nYetib bordi: ${success}\nXatolik: ${failed}`, adminKeyboard());
  }

  if (user.step === "position") {
    if (!positions.includes(text)) return ctx.reply("Iltimos, pastdagi tugmalardan vakansiya tanlang.");
    user.position = text;
    user.step = "fullName";
    return ctx.reply(`Siz tanladingiz: ${text} ✅\n\nEndi ism-familyangizni yozing.`);
  }

  if (user.step === "fullName") {
    user.fullName = text;
    if (user.position === "Sotuv manageri" || user.position === "Shofyor-gruzchik") {
      user.step = "birthDate";
      return ctx.reply("Tug‘ilgan sanangizni yozing.\n\nMasalan: 12.05.1995");
    }
    user.step = "phone";
    return ctx.reply("Telefon raqamingizni yuboring 📱", Markup.keyboard([[Markup.button.contactRequest("📞 Raqam yuborish")]]).resize());
  }

  if (user.step === "birthDate") {
    user.birthDate = text;
    user.step = "address";
    return ctx.reply("Manzilingizni yozing.\n\nMasalan: Buxoro shahar, ...");
  }

  if (user.step === "address") {
    user.address = text;
    user.step = "phone";
    return ctx.reply("Telefon raqamingizni yuboring 📱", Markup.keyboard([[Markup.button.contactRequest("📞 Raqam yuborish")]]).resize());
  }

  if (user.step === "phone") return ctx.reply("Iltimos, pastdagi 📞 Raqam yuborish tugmasini bosing.");

  if (user.step === "salesQuestion") {
    const currentQuestion = SALES_QUESTIONS[user.salesIndex];
    user.salesAnswers[currentQuestion.key] = text;
    user.salesIndex++;

    if (user.salesIndex < SALES_QUESTIONS.length) {
      return ctx.reply(SALES_QUESTIONS[user.salesIndex].text);
    }

    user.step = "video";
    return ctx.reply("Endi o‘zingiz haqingizda 30–60 soniyalik video yuboring 🎥\n\nVideoda ayting:\n1. Ismingiz\n2. Sotuv tajribangiz\n3. Nega Digi World’da ishlamoqchisiz?", Markup.removeKeyboard());
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
    return ctx.reply("Sog‘ligingizda ishga ta’sir qilishi mumkin bo‘lgan muammo bormi?\n\nAgar yo‘q bo‘lsa, “yo‘q” deb yozing.");
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
      return ctx.reply("Endi o‘zingiz haqingizda 30–60 soniyalik video yuboring 🎥\n\nVideoda ayting:\n1. Ismingiz\n2. Prava kategoriyangiz\n3. Oldingi ish joyingiz\n4. Nega Digi World’da ishlamoqchisiz?");
    }
    user.step = "motivation";
    return ctx.reply("Nega aynan Digi World’da ishlamoqchisiz?");
  }

  if (user.step === "motivation") {
    user.motivation = text;
    user.step = "video";
    return ctx.reply("Endi o‘zingiz haqingizda 30–60 soniyalik video yuboring 🎥\n\nVideoda ayting:\n1. Ismingiz\n2. Qaysi vakansiyaga topshiryapsiz\n3. Tajribangiz\n4. Nega aynan Digi World’da ishlamoqchisiz?");
  }

  if (user.step === "video") return ctx.reply("Iltimos, video yuboring 🎥");
  if (user.step === "done") return ctx.reply("Sizning arizangiz allaqachon qabul qilingan ✅\n\nYangi ariza topshirish uchun /start bosing.");
});

bot.launch();
console.log("Bot ishga tushdi ✅");
