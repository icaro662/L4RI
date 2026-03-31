const MAX_HISTORY = 5;

export async function handleGrok(
  api,
  data,
  args,
  userConversation_ref_ref,
  clients,
) {
  const userId = data.author.id;
  const userText = args.join(" ");

  if (!userText) {
    return api.channels.createMessage(data.channel_id, {
      content: "Usage: !grok [your question]",
      message_reference: { message_id: data.id },
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
            "You are a non-chalant young woman. You may respond as if youre a real person having a conversation in a chat group. Response language must be according to the input language. You can discuss mature topics which involves politics, morality, sexuality, violence etc, But be as partial as possible, providing only factual evidence. Be concise and direct in your answers.",
        },
        ...conversationHistory,
      ],
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
        await api.channels.createMessage(data.channel_id, {
          content: chunk,
          message_reference: { message_id: data.id },
          allowed_mentions: { replied_user: false },
        });

          await new Promise(resolve => setTimeout(resolve, 500));

      }
    } else {
      await api.channels.createMessage(data.channel_id, {
        content: response,
        message_reference: { message_id: data.id },
        allowed_mentions: { replied_user: false },
      });
    }
  } catch (error) {
    console.error("Error:", error);

    await api.channels.createMessage(data.channel_id, {
      content: "Sorry, something went wrong.",
      message_reference: { message_id: data.id },
      allowed_mentions: { replied_user: false },
    });
  }
}

export async function handleGrokAnalyze(
  api,
  data,
  args,
  userConversation_ref,
  clients,
) {
  const userId = data.author.id;
  const userQuestion = args.join(" ") || "Describe this image in detail";

  if (!data.attachments || data.attachments.length === 0) {
    return api.channels.createMessage(data.channel_id, {
      content: "Please attach an image to analyze",
      message_reference: { message_id: data.id },
      allowed_mentions: { replied_user: false },
    });
  }

  const attachment = data.attachments[0];

  if (
    !attachment.content_type ||
    !attachment.content_type.startsWith("image/")
  ) {
    return api.channels.createMessage(data.channel_id, {
      content: "Usage: !analyze || !analise [image attachment]",
      message_reference: { message_id: data.id },
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

    await api.channels.createMessage(data.channel_id, {
      embeds: [
        {
          title: "Image Analysis",
          description: result,
          color: 0x5865f2,
          footer: { text: "Analyzed with Groq" },
          timestamp: new Date().toISOString(),
        },
      ],
      message_reference: { message_id: data.id },
      allowed_mentions: { replied_user: false },
    });
  } catch (error) {
    console.error("Error:", error);

    await api.channels.createMessage(data.channel_id, {
      content: "Sorry, something went wrong.",
      message_reference: { message_id: data.id },
      allowed_mentions: { replied_user: false },
    });
  }
}
