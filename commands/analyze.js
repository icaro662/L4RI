export const definition = {
  name: 'analyze',
  description: 'Prompt grok model to analyze image.',
  options: [
    {
      name: 'query',
      description: 'What to analyze',
      type: 11,
      required: true
    }
  ]
};

async function AnalyzePrompt(api, data, query, userConversation_ref, clients) {
  const userId = data.author.id;
  const userQuestion = query.join(" ") || "Describe this image in detail";
  const attachment = data.attachments[0];

  if (
    !attachment.content_type ||
    !attachment.content_type.startsWith("image/")
  ) {
    return api.channels.createMessage(data.channel_id, {
      content: "Usage: @index analyze || @index analise [image attachment]",
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
      content: query.join(" ") || `Analyze this image: ${attachment.filename}`,
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

export async function execute(api, data, userConversation_ref, clients) {
  const query = data.data.options.find(o => o.name === 'query')?.value;
  await AnalyzePrompt(api, data, query, userConversation_ref, clients)
}
