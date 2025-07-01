const { Client, Intents } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ],
    partials: ['CHANNEL', 'MESSAGE', 'REACTION', 'USER']
});

// keepAlive
const express = require('express');
const app = express();

// A simple route that returns a message
app.get('/', (req, res) => {
  res.send('Bot is alive!');
});

// Start server on port 3000 or the port Glitch sets
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});

module.exports = app;

const questionChannelId = '1081912541808181308'; // Replace with your actual channel ID
const guestRoleId = '964189416128131173'; // Replace with your actual Guest role ID
const strangerRoleId = '964532381493125130'; // Replace with your actual Stranger role ID
const memberFile = './members.json';

// Array of phrase variations
const variations = [
    "One who has eaten the fruit and tasted its mysteries.",
    "one who has eaten the fruit and tasted its mysteries.",
    "One who has eaten the fruit and tasted its mysteries",
    "one who has eaten the fruit and tasted its mysteries",
    "ONE WHO HAS EATEN THE FRUIT AND TASTED ITS MYSTERIES.",
    "one who has eaten the fruit, and tasted its mysteries.",
    "One who has eaten the fruit, and tasted its mysteries.",
    "One Who Has Eaten The Fruit And Tasted Its Mysteries.",
    "ONE WHO HAS EATEN THE FRUIT AND TASTED ITS MYSTERIES",
    "one who has eaten the fruit and tasted its mysteries."
];

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);

    // Set the bot's status
    if (client.user) {
        client.user.setPresence({
            status: 'online',
            activities: [{ name: 'the Garden Gate', type: 'WATCHING' }],
        });
    }
});

// Handle new member joining
client.on('guildMemberAdd', async member => {
    try {
        const channel = member.guild.channels.cache.get(questionChannelId);
        if (channel) {
            await channel.send(`<@${member.id}> Who knocks at the Garden Gate?`);

            let members = [];
            if (fs.existsSync(memberFile)) {
                try {
                    const data = fs.readFileSync(memberFile, 'utf8');
                    members = JSON.parse(data) || [];
                } catch (error) {
                    console.error('Error reading or parsing members.json:', error);
                }
            }
            members.push(member.id);
            fs.writeFileSync(memberFile, JSON.stringify(members, null, 2));
        }
    } catch (error) {
        console.error('Error in guildMemberAdd:', error);
    }
});

// Handle messages
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return; // Ignore bot messages and DMs

    // Check if the message content matches any variation
    if (message.channel.id === questionChannelId && variations.includes(message.content)) {
        let members = [];
        if (fs.existsSync(memberFile)) {
            members = JSON.parse(fs.readFileSync(memberFile, 'utf8'));
        }

        const memberIdIndex = members.indexOf(message.author.id);
        if (memberIdIndex !== -1) {
            members.splice(memberIdIndex, 1);
            fs.writeFileSync(memberFile, JSON.stringify(members, null, 2));

            const guestRole = message.guild.roles.cache.get(guestRoleId);
            const strangerRole = message.guild.roles.cache.get(strangerRoleId);

            if (guestRole) {
                const member = await message.guild.members.fetch(message.author.id);

                // Add the Guest role
                await member.roles.add(guestRole);
                console.log(`Added Guest role to ${member.user.tag}`);

                // Remove the Stranger role, if it exists
                if (strangerRole && member.roles.cache.has(strangerRole.id)) {
                    await member.roles.remove(strangerRole);
                    console.log(`Removed Stranger role from ${member.user.tag}`);
                }

                // React with the flower emoji
                await message.react("<:White_Lotus_Tile:1361346119984222328>");
            }
        }
    }

    // Command: !removeStrangerRoles
    if (message.content.toLowerCase() === '!removeStrangerRoles') {
        if (!message.member.permissions.has('MANAGE_ROLES')) {
            return message.reply("You don't have permission to use this command.");
        }

        const guestRole = message.guild.roles.cache.get(guestRoleId);
        const strangerRole = message.guild.roles.cache.get(strangerRoleId);

        if (!guestRole || !strangerRole) {
            return message.reply("The Guest or Stranger role could not be found.");
        }

        let count = 0; // Counter for members whose roles are updated

        try {
            // Fetch all members of the server
            const members = await message.guild.members.fetch();
            for (const [_, member] of members) {
                if (member.roles.cache.has(guestRole.id) && member.roles.cache.has(strangerRole.id)) {
                    await member.roles.remove(strangerRole); // Remove the Stranger role
                    count++;
                }
            }

            // Send a confirmation message
            message.reply(`Removed the Stranger role from ${count} members.`);
        } catch (error) {
            console.error('Error in !removeStrangerRoles command:', error);
            message.reply('An error occurred while removing roles.');
        }
    }
});


// Use process.env to handle your bot token securely
client.login(process.env.DISCORD_TOKEN);
