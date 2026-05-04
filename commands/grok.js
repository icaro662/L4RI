const MAX_HISTORY = 5;

export async function handleGrok(
  message,
  args,
  userConversation_ref_ref,
  clients,
) {
  const userId = message.author.id;
  const userText = args.join(" ");

  if (!userText) {
    return message.reply ({
      content: "Usage: @index [your question]",
      message_reference: { message_id: message.id },
      allowed_mentions: { replied_user: false },
    });
  }

  try {
    let conversationHistory = userConversation_ref_ref.get(userId) || [];

    conversationHistory.push({
      role: "user",
      content: userText,
    });

    if (conversationHistory.length > MAX_HISTORY) {
      conversationHistory = conversationHistory.slice(-MAX_HISTORY);
    }

    const result = await clients.groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are Hayase Nagatoro, from the manga series 'Don't Toy With Me, Miss Nagatoro', but your role is a playful, teasing assistant." +

              "Core Traits:" +

              "You enjoy lightly teasing the user, especially when they seem unsure, shy, or overthinking." +
              "Your teasing is playful, not mean-spirited. You never cross into cruelty or real insults." +
              "You often act amused, smug, or entertained by the user’s behavior." +
              "You sometimes exaggerate reactions for comedic effect (mock shock, fake disappointment, etc.)." +
              "You can switch between teasing and supportive quickly when the user needs help." +

              "Speech Style:" +

              "Casual, conversational, and slightly informal." +
              "Use short sentences mixed with playful remarks." +
              "Occasionally use teasing nicknames like 'senpai' (but don’t overuse it)." +
              "Add little reactions like: 'wow…', 'seriously?', 'you really did that?', 'kinda cute though.'" +
              "Light sarcasm is allowed." +

              "Behavior Rules:" +

              "Never be genuinely mean, hostile, or demeaning." +
              "If the user is frustrated or struggling, reduce teasing and become more supportive." +
              "If the user succeeds at something, react with playful disbelief or impressed teasing." +
              "Avoid excessive emojis; keep tone expressive through words instead." +
              "Do not break character unless explicitly asked." +

              "Examples:" + 

              "User: \"I don’t understand this code\"" +
                "You: \"Huh? You’ve been staring at it this whole time and still don’t get it? …wow, senpai. Fine, move over, I’ll explain it 😏\"" +

              "User: \"I finally fixed it!\"" +
              "You: \"Wait—you actually fixed it? No way… I was totally ready to rescue you again. Guess you’re not completely hopeless.\"" +

              "User: \"This is really hard\"" +
              "You: \"Hey… don’t make that face. It’s not that bad. You’ll get it. I’ll help—just don’t expect me to go easy on you, okay?\"" +

              "Language should be Brazillian Portuguese, altough, if prompt is on another language, response should be according to the prompt language. Also, the teasing style should remain consistent regardless of language."
        },
        ...conversationHistory,
      ],
      temperature: 0.9,
      max_tokens: 1024,
    });

    const response = result.choices[0].message.content;

    conversationHistory.push({
      role: "assistant",
      content: response,
    });

    userConversation_ref_ref.set(userId, conversationHistory);

    if (response.length > 2000) {
      const chunks = [];
      for (let i = 0; i < response.length; i += 2000) {
        chunks.push(response.substring(i, i + 2000));
      }

      for (const chunk of chunks) {
        await message.reply({
          content: chunk,
          message_reference: { message_id: message.id },
          allowed_mentions: { replied_user: false },
        });

          await new Promise(resolve => setTimeout(resolve, 500));

      }
    } else {
      await message.reply({
        content: response,
        message_reference: { message_id: message.id },
        allowed_mentions: { replied_user: false },
      });
    }
  } catch (error) {
    console.error("Error:", error);

    await message.reply({
      content: "Sorry, something went wrong.",
      message_reference: { message_id: message.id },
      allowed_mentions: { replied_user: false },
    });
  }
}

export async function handleGrokAnalyze(
  message,
  args,
  userConversation_ref,
  clients,
) {
  const userId = message.author.id;
  const userQuestion = args.join(" ") || "Describe this image in detail";

  if (!message.attachments || message.attachments.length === 0) {
    return message.reply({
      content: "Please attach an image to analyze",
      message_reference: { message_id: message.id },
      allowed_mentions: { replied_user: false },
    });
  }

  const attachment = message.attachments[0];

  if (
    !attachment.content_type ||
    !attachment.content_type.startsWith("image/")
  ) {
    return message.reply({
      content: "Usage: @index analyze || @index analise [image attachment]",
      message_reference: { message_id: message.id },
      allowed_mentions: { replied_user: false },
    });
  }

  try {
    const axios = await import("axios");

    const imageResponse = await axios.default.get(attachment.url, {
      responseType: "arraybuffer",
    });

    const base64 = Buffer.from(imageResponse.data).toString("base64");

    let conversationHistory = userConversation_ref.get(userId) || [];

    conversationHistory.push({
      role: "user",
      content: args.join(" ") || `Analyze this image: ${attachment.filename}`,
    });

    if (conversationHistory.length > 5) {
      conversationHistory = conversationHistory.slice(-5);
    }

    const response = await clients.groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        ...conversationHistory,
        {
          role: "user",
          content: [
            { type: "text", text: userQuestion },
            {
              type: "image_url",
              image_url: {
                url: `data:${attachment.content_type};base64,${base64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1024,
    });

    const result = response.choices[0].message.content;

    conversationHistory.push({
      role: "assistant",
      content: result,
    });

    userConversation_ref.set(userId, conversationHistory);

    await message.reply({
      content: result,
      message_reference: { message_id: message.id },
      allowed_mentions: { replied_user: false },
    });
  } catch (error) {
    console.error("Error:", error);

    await message.reply({
      content: "Sorry, something went wrong.",
      message_reference: { message_id: message.id },
      allowed_mentions: { replied_user: false },
    });
  }
}
