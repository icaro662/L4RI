const userConversations = new Map();
const MAX_HISTORY = 5;

export async function handleGrok(api, data, args, userConversations_ref, clients) {
  const userId = data.author.id;
  const userText = args.join(" ");
  
  if (!userText) {
    return api.channels.createMessage(data.channel_id, {
      content: "Usage: !grok [your question]",
      message_reference: { message_id: data.id },
      allowed_mentions: { replied_user: false }
    });
  }

  try {
    const { Groq } = await import('groq-sdk');
    const groq = new Groq({
      apiKey: clients.groqKey,
    });

    let conversationHistory = userConversations_ref.get(userId) || [];
    
    conversationHistory.push({
      role: 'user',
      content: userText
    });

    if (conversationHistory.length > MAX_HISTORY) {
      conversationHistory = conversationHistory.slice(-MAX_HISTORY);
    }

    const result = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: 'system',
          content: 'You are a non-chalant young woman. You may respond as if youre a real person having a conversation in a chat group. Response language must be according to the input language. You can discuss mature topics which involves politics, morality, sexuality, violence etc, But be as partial as possible, providing only factual evidence. Be concise and direct in your answers.'
        },
        ...conversationHistory
      ],
      max_tokens: 1024
    });

    const response = result.choices[0].message.content;

    conversationHistory.push({
      role: 'assistant',
      content: response
    });
    
    userConversations_ref.set(userId, conversationHistory);
    
    if (response.length > 2000) {
      const chunks = [];
      for (let i = 0; i < response.length; i += 2000) {
        chunks.push(response.substring(i, i + 2000));
      }
      
      for (const chunk of chunks) {
        await api.channels.createMessage(data.channel_id, {
          content: chunk,
          message_reference: { message_id: data.id },
          allowed_mentions: { replied_user: false }
        });
      }
    } else {
      await api.channels.createMessage(data.channel_id, {
        content: response,
        message_reference: { message_id: data.id },
        allowed_mentions: { replied_user: false }
      });
    }

  } catch (error) {
    console.error("Error:", error);
    
    await api.channels.createMessage(data.channel_id, {
      content: "Sorry, something went wrong.",
      message_reference: { message_id: data.id },
      allowed_mentions: { replied_user: false }
    });
  }
}
