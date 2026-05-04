async function getAvatar(message, args) {
    const user = message.mentions?.[0] || message.author;
    
    const avatarUrl = user.displayAvatarURL({ size: 256 });
    
    await message.reply({
        embeds: [
            {
                title: `${user.username}'s avatar`,
                image: { url: avatarUrl }
            },
        ],
        message_reference: { message_id: message.id },
        allowed_mentions: { replied_user: false },
    });
}

export async function handleAvatar(message, args) {
    await getAvatar(message, args);
}