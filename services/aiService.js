const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function analyzeCandidate(user) {

  const prompt = `
Siz professional HR manager sifatida kandidatni baholang.

Vakansiya:
${user.position}

Ism:
${user.fullName}

Yosh:
${user.age}

Hudud:
${user.city}

Tajriba:
${user.experience}

Oldingi ish joyi:
${user.previousJob}

Motivatsiya:
${user.motivation}

Kandidatni 0 dan 100 gacha baholang.

Qisqa HR summary yozing.

Faqat JSON formatda javob qaytaring.

Format:

{
  "score": 0,
  "summary": ""
}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",

    messages: [
      {
        role: "system",
        content: "Siz professional HR managersiz.",
      },

      {
        role: "user",
        content: prompt,
      },
    ],

    temperature: 0.7,
  });

  const content = response.choices[0].message.content;

  return JSON.parse(content);
}

module.exports = {
  analyzeCandidate,
};