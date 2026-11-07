const MAX_HISTORY = 5;
import { error as logError } from '../utils/logger.js';

/**
 * Handles conversational AI interactions using the Groq API (openai/gpt-oss-120b)
 * in the Nagatoro persona with multi-turn conversation memory.
 *
 * Flow:
 * 1. Input Parsing: Extracts author ID from `message.author.id` and reconstructs prompt from `args`.
 * 2. Validation: If `userText` is empty, replies with usage guidelines and returns early.
 * 3. History Retrieval & Pruning: Retrieves previous messages for the user from `userConversation_ref_ref`, appends new user message, and caps history at `MAX_HISTORY` turns.
 * 4. API Request: Dispatches a chat completion call to Groq with persona system instructions and current message history.
 * 5. State Persistence: Records assistant response back into the conversation history and persists it in the map.
 * 6. Message Dispatch: Checks if response exceeds 2000 characters; if so, splits response into 2000-char chunks and sends with 500ms delay; otherwise sends a single reply.
 * 7. Error Handling: Catches any exceptions, logs via `logError`, and notifies the user with a friendly error message.
 *
 * @param {Object} message - Fluxer message object.
 * @param {string[]} args - Command arguments forming the user's prompt.
 * @param {Map<string, Array<{role: string, content: string}>>} userConversation_ref_ref - In-memory map storing conversation histories by user ID.
 * @param {Object} clients - API clients container object containing `groq` client instance.
 * @returns {Promise<void>}
 */
export async function handleGrok(
  message,
  args,
  userConversation_ref_ref,
  clients,
) {
  // Step 1: Extract user ID and reconstruct prompt from arguments.
  const userId = message.author.id;
  const userText = args.join(" ");

  // Step 2: Validate that prompt text is present.
  if (!userText) {
    return message.reply ({
      ping: false,
      content: "Usage: @L4RI [your question]",
    });
  }

  try {
    // Step 3: Retrieve and truncate user conversation history to MAX_HISTORY turns.
    let conversationHistory = userConversation_ref_ref.get(userId) || [];

    conversationHistory.push({
      role: "user",
      content: userText,
    });

    if (conversationHistory.length > MAX_HISTORY) {
      conversationHistory = conversationHistory.slice(-MAX_HISTORY);
    }

    // Step 4: Dispatch chat completion request to Groq API.
    const result = await clients.groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
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
      temperature: 1,
      max_tokens: 4096,
    });

    // Step 5: Save assistant response to conversation history map.
    const response = result.choices[0].message.content;

    conversationHistory.push({
      role: "assistant",
      content: response,
    });

    userConversation_ref_ref.set(userId, conversationHistory);

    // Step 6: Chunk and send response if exceeding 2000 characters, or send single reply.
    if (response.length > 2000) {
      const chunks = [];
      for (let i = 0; i < response.length; i += 2000) {
        const end = Math.min(i + 2000, response.length);
        chunks.push(response.substring(i, end));
      }

      for (const chunk of chunks) {
        await message.reply({
          ping: false,
          content: chunk,
        });

          await new Promise(resolve => setTimeout(resolve, 500));

      }
    } else {
      await message.reply({
        ping: false,
        content: response,
      });
    }
  } catch (error) {
    // Step 7: Catch and log unexpected runtime errors.
    logError('Grok', 'Error:', error);

    await message.reply({
      ping: false,
      content: "Sorry, something went wrong.",
    });
  }
}


/**
 * Performs multimodal vision analysis using Groq's vision model (meta-llama/llama-4-scout-17b-16e-instruct)
 * on an attached image with optional user inquiry.
 *
 * Flow:
 * 1. Input Parsing: Extracts author ID, user query (defaulting to a Portuguese fallback), and attachments.
 * 2. Attachment Validation: Checks if an attachment is present and whether its URL has a supported image extension (.png, .jpg, .jpeg, .gif, .webp).
 * 3. Image Download: Fetches image binary buffer via Axios and encodes into base64 format.
 * 4. History Management: Retrieves conversation history, adds current query/filename, and trims to last 5 entries.
 * 5. Vision API Request: Sends completion request to Groq vision model with the image base64 data URL and text prompt.
 * 6. History Update: Appends vision model's response to history and stores in conversation map.
 * 7. Result Presentation: Sends an embed reply containing the generated analysis text.
 * 8. Error Handling: Catches and logs any network or API failures, informing the user.
 *
 * @param {Object} message - Fluxer message object containing image attachment and reply methods.
 * @param {string[]} args - Command arguments forming custom questions about the image.
 * @param {Map<string, Array<Object>>} userConversation_ref - In-memory map storing conversation histories by user ID.
 * @param {Object} clients - API clients container object containing `groq` client instance.
 * @returns {Promise<void>}
 */
export async function handleGrokAnalyze(
  message,
  args,
  userConversation_ref,
  clients,
) {
  // Step 1: Extract user context, prompt, and attachment reference.
  const userId = message.author.id;
  const userQuestion = args.join(" ") || "Descreva esta imagem com detalhe";

  // Step 2: Validate attachment presence.
  if (!message.attachments || message.attachments.length === 0) {
    return message.reply({
      content: "Please attach an image to analyze",
    });
  }

  const attachment = message.attachments.first();

  // Step 3: Validate image file extension.
  const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
  const url = attachment.url.split('?')[0]; // strip query params Fluxer adds
  const isImage = validExtensions.some(ext => url.endsWith(ext));

  if (!attachment || !isImage) {
      return await message.reply({
        content: 'Invalid image format.'
      });
    }

  try {
    // Step 4: Download image binary buffer and convert to base64.
    const axios = await import("axios");

    const imageResponse = await axios.default.get(attachment.url, {
      responseType: "arraybuffer",
    });

    const base64 = Buffer.from(imageResponse.data).toString("base64");

    // Step 5: Retrieve and truncate user conversation history.
    let conversationHistory = userConversation_ref.get(userId) || [];

    conversationHistory.push({
      role: "user",
      content: args.join(" ") || `Analise essa imagem: ${attachment.filename}`,
    });

    if (conversationHistory.length > 5) {
      conversationHistory = conversationHistory.slice(-5);
    }

    // Step 6: Submit multimodal completion request to Groq vision model.
    const response = await clients.groq.chat.completions.create({
      model: "qwen/qwen3.8-27b",
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
      max_tokens: 4096,
    });

    // Step 7: Record assistant response in conversation history.
    const result = response.choices[0].message.content;

    conversationHistory.push({
      role: "assistant",
      content: result,
    });

    userConversation_ref.set(userId, conversationHistory);

    // Step 8: Send analysis embed reply to user.
    await message.reply({
      ping: false,
      content: result,
    });
  } catch (error) {
    // Step 9: Catch and log unexpected runtime errors.
    logError('GrokImage', 'Error:', error);

    await message.reply({
      ping: false,
      content: "Sorry, something went wrong.",
    });
  }
}
