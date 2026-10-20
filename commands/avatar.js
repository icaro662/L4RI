/**
 * Command for returning the avatar of a user. If a user is mentioned, it returns their avatar;
 * otherwise, it returns the avatar of the message author.
 */

/**
 * Retrieves the avatar of either the first mentioned user or the message author and sends an embed reply.
 *
 * Flow:
 * 1. Target Resolution: Checks if any user is mentioned in `message.mentions`. If found, selects the first mention; otherwise defaults to `message.author`.
 * 2. Avatar URL Extraction: Invokes `displayAvatarURL({ size: 256 })` on the resolved user to obtain a 256px resolution avatar link.
 * 3. Embed Construction & Delivery: Sends a reply embed featuring the user's username in the title and the avatar image URL, with pinging disabled.
 *
 * @param {Object} message - The Fluxer message object representing the triggering message.
 * @param {Object} [message.author] - Author of the incoming message.
 * @param {Array<Object>} [message.mentions] - Array of mentioned users in the message.
 * @param {Function} message.reply - Function used to reply to the user message.
 * @returns {Promise<void>} Resolves when the reply message has been sent.
 */
async function getAvatar(message) {
    // Step 1: Identify target user from mentions or fallback to message author.
    const user = message.mentions?.[0] || message.author;

    // Step 2: Retrieve the avatar URL at 256x256 resolution using the Fluxer user method.
    const avatarUrl = user.displayAvatarURL({ size: 256 });
    
    // Step 3: Send a reply to the message with an embed containing the user's avatar.
    await message.reply({ 
        ping: false,
        embeds: [
            {
                title: `${user.username}'s avatar`,
                image: { url: avatarUrl }
            },
        ]
    });
}

/**
 * Entry point handler for the avatar command.
 *
 * Flow:
 * 1. Forwards the message object to `getAvatar` to resolve user and deliver the avatar embed.
 *
 * @param {Object} message - The Fluxer message object passed by the command dispatcher.
 * @returns {Promise<void>} Resolves when avatar retrieval and reply are completed.
 */
export async function handleAvatar(message) {
    // Step 1: Delegate processing to the internal getAvatar function.
    await getAvatar(message);
}
