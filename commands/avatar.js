async function getAvatar(message) {
    const user = message.mentions?.[0] || message.author;
    
    const avatarUrl = user.displayAvatarURL({ size: 256 });
    
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