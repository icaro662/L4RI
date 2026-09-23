/*
    Command for returning the avatar of a user. If a user is mentioned, it returns their avatar; otherwise, it returns the avatar of the message author.
    Args:
    message: The message object from the Fluxer API.
*/

async function getAvatar(message) {

    // Checks if a user is mentioned in the message. If so, it uses that user's avatar; otherwise, it uses the author's avatar.
    const user = message.mentions?.[0] || message.author;

    // Gets the URL of the user's avatar.
    // Uses inate Fluxer method that returns the user's avatar URL with a size of 256 pixels.
    const avatarUrl = user.displayAvatarURL({ size: 256 });
    
    // Sends a reply to the message with an embed containing the user's avatar.
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

export async function handleAvatar(message) {
    await getAvatar(message);
}