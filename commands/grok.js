export const definition = {
  name: 'grok',
  description: 'Prompt grok',
  options: [
    {
      name: 'query',
      description: 'What to prompt',
      type: 3,
      required: true
    }
  ]
};

const MAX_HISTORY = 5;

async function grokPrompt(api, data, userConversation_ref, clients) {
  const userId = data.author.id;
  const userText = query.join(" ");
  
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
          
          "All response may be according to the user's input language, but the teasing style should remain consistent regardless of language."
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

export async function execute(api, data, userConversation_ref, clients) {
  const query = data.data.options.find(o => o.name === 'query')?.value;
  await grokPrompt(api, data, query, userConversation_ref, clients)
}