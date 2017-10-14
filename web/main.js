let isNode = process && process.versions && process.version.electron
const CHANNEL_ICONS = {
  text: "https://cdn.rawgit.com/encharm/Font-Awesome-SVG-PNG/master/white/svg/hashtag.svg",
  voice: "https://cdn.rawgit.com/encharm/Font-Awesome-SVG-PNG/master/white/svg/volume-up.svg",
  category: "https://cdn.rawgit.com/encharm/Font-Awesome-SVG-PNG/master/white/svg/chevron-down.svg"
}
// if(isNode) {
var Discord = require("discord.js")
// }


var bot = new Discord.Client()
var token = window.localStorage.getItem("token")
var windowManager

bot.login(token).then(function() {
  windowManager = new WindowManager(bot)
})


class WindowManager {
  constructor(bot) {
    this.guilds = document.getElementById("guilds")
    this.bot = bot
    this.channel = this.bot.channels.get(window.localStorage.getItem("lastchannel")) || this.bot.channels.filter(function(channel) {
      return channel.type == "text"
    }).first()
    
    this.guildHandler = new GuildHandler(this.channel, this)
    this.loadGuilds()
  }
  channelChange(channel) {
    delete this.channel
    this.channel = channel
    delete this.guildHandler
    this.guildHandler = new GuildHandler(this.channel, this)
  }
  loadGuilds() {
    let guilds = this.bot.user.settings.guildPositions.map((guildID, position) => {
      return {
        guild: this.bot.guilds.get(guildID),
        position: position
      }
    })
    guilds.filter(guild => !guild.unavailable).sort((guild1, guild2) => {
      return guild1.position - guild2.position
    }).forEach(guild => this.addGuild(guild.guild))
  }
  addGuild(guild) {
    if(!guild) return
    var guildElement = document.createElement("div")
    var guildContainer = document.createElement("div")
    guildContainer.classList = "guild-outer"
    guildElement.classList = "guild"
    guildElement.style.backgroundImage = `url("${guild.iconURL()}")`
    guildElement.id = guild.id
    var self = this
    guildElement.onclick = function() {
      self.channelChange(self.bot.guilds.get(this.id).channels.filter(function(channel) {
        return channel.type == "text"
      }).first())
    }
    guildContainer.appendChild(guildElement)
    this.guilds.appendChild(guildContainer)
  }
}

class ChannelHandler {
  constructor(channel) {
    this.channel = channel
    this.messageDOMHandler = new MessageDOMHandler()
    this.messageHandler = new MessageHandler(this.channel, this.messageDOMHandler)
    this.messageHandler.fetchMessages()
    this.loadMembers()
  }
  loadMembers() {
    let memberList = document.getElementById("member-list")
    memberList.innerHTML = ""
    let members = this.channel.guild.members.filter(member => this.channel.permissionsFor(member).has("VIEW_CHANNEL"))
    members.forEach(member => this.createMember(member))
  }
  createMember(member) {
    let memberList = document.getElementById("member-list")
    let userContainer = document.createElement("div")
    let username = document.createElement("span")
    let presenceBulb = document.createElement("div")
    let avatar = document.createElement("div")
    let presenceText = document.createElement("span")
    let memberInfoContainer = document.createElement("div")
    memberInfoContainer.classList = "member-list-info-container"
    userContainer.classList = "member-list-container"
    avatar.classList = "member-list-avatar"
    avatar.style.backgroundImage = `url(${member.user.displayAvatarURL()})`
    username.innerText = member.displayName
    username.classList = "member-list-username"
    username.style.color = member.displayHexColor || "#fff"
    presenceBulb.classList = `presence-bulb presence-${member.user.presence.status}`
    presenceText.innerText = member.user.presence.activity ? member.user.presence.activity.name : ""
    presenceText.classList = "member-list-playing-status"
    avatar.appendChild(presenceBulb)
    memberInfoContainer.appendChild(username)
    memberInfoContainer.appendChild(presenceText)
    userContainer.appendChild(avatar)
    userContainer.appendChild(memberInfoContainer)
    memberList.appendChild(userContainer)
  }
}

class GuildHandler {
  constructor(channel, windowManager) {
    this.channelHandler = new ChannelHandler(channel)
    this.channel = channel
    this.guild = channel.guild
    this.channelList = document.getElementById("channel-list")
    this.windowManager = windowManager
    this.loadChannels()
    this.createGuild()
  }
  createGuild() {
    document.getElementById("guild-name").innerText = this.guild.name
  }
  loadChannels() { 
    var self = this
    this.channelList.innerHTML = ""
    
    this.guild.channels
      .filter(channel => channel.type != "category" && !channel.parentID)
      .sort((a, b) => a.rawPosition - b.rawPosition)
      .forEach(channel => this.createChannel(channel, this.channelList))

    this.guild.channels
      .filter(channel => channel.type == "category")
      .sort((a,b) => a.position - b.position)
      .forEach(channel => this.createCategory(channel))
  }
  createCategory(category) {
    let categoryWrap = document.createElement("div")
    let categoryName = document.createElement("span")
    let categoryIcon = document.createElement("object")
    let categoryNameWrap = document.createElement("div")
    let categoryChannels = document.createElement("div")
    categoryName.innerText = category.name
    categoryName.classList = "channel-name"
    categoryIcon.classList = "hashtag"
    categoryIcon.type = "image/svg+xml"
    categoryIcon.data = CHANNEL_ICONS.category
    categoryWrap.classList = "category-wrap"
    category.children.forEach(channel => this.createChannel(channel, categoryChannels))
    categoryNameWrap.appendChild(categoryIcon)
    categoryNameWrap.appendChild(categoryName)
    categoryWrap.appendChild(categoryNameWrap)
    categoryWrap.appendChild(categoryChannels)
    this.channelList.appendChild(categoryWrap)
  }
  createChannel(channel, channelList) {
    let channelWrap = document.createElement("div")
    channelWrap.classList = "channel-wrap"
    if(channel.id == this.channel.id) channelWrap.classList += " channel-selected"
    channelWrap.id = channel.id
    let hashTag = document.createElement("object")
    hashTag.data = CHANNEL_ICONS[channel.type]
    hashTag.type = "image/svg+xml"
    hashTag.classList = "hashtag"
    channelWrap.appendChild(hashTag)
    let channelName = document.createElement("span")
    channelName.innerText = channel.name
    channelName.classList = "channel-name"
    channelWrap.appendChild(channelName)
    var self = this
    if(channel.type == "text") {
      channelWrap.onclick = function() {
        self.windowManager.channelChange(channel.client.channels.get(this.id))
      }
    } else if(channel.type == "voice") {
      channelWrap.onclick = function() {
        new VoiceManager(channel)
      }
    }
    channelList.appendChild(channelWrap)
  }
}

class MessageHandler {
  constructor(channel, messageDOMHandler) {
    this.domManager = messageDOMHandler
    this.channel = channel
    this.channel.client.removeAllListeners("message")
    var self = this
    this.channel.client.on("message", function(message) {
      self.onMessage(message, self, true)
    })
    // this.collector = this.channel.awaitMessages(function(message) {
    //   self.onMessage(message)
    // })
    this.bot = this.channel.client
    this.input = document.getElementById("message-textarea")
    this.input.onkeypress = function(event) {
      if (event.which == 13 || event.keyCode == 13) {
        self.channel.send(this.value)
        this.value = ""
        return false
      } else {
        return true
      }
    }
  }

  fetchMessages(offset) {
    let self = this
    this.channel.messages.fetch({
      limit: 100,
      before: offset
    }).then(function(messages) {
      messages.forEach(function(message) {
        self.domManager.addMessage(message, true, true)
      })
    })
  }

  onMessage(message, passedThis, bottom) {
    var self = this.domManager ? this : passedThis
    if(message.channel.id != self.channel.id) return 
    self.domManager.addMessage(message, false, bottom)
    return false
  }
}

class MarkdownManager {
  constructor() {

  }

  parse(input) {
    return input
  }
}

class MessageDOMHandler {
  constructor() {
    this.messageDom = document.getElementById("messages")
    this.clearDom()
    this.markdownManager = new MarkdownManager()
  }
  clearDom() {
    this.messageDom.innerHTML = ""
  }
  addMessage(message, addToTop, scroll) {
    let messageObject = document.createElement("div")
    messageObject.classList = "message"
    messageObject.id = message.id
    let avatar = document.createElement("div")
    avatar.classList = "message-avatar"
    avatar.style.backgroundImage = `url('${message.author.displayAvatarURL()}')`
    messageObject.appendChild(avatar)
    let usernameAndContent = document.createElement("div")
    usernameAndContent.classList = "message-username-and-content"

    let username = document.createElement("div")
    username.classList = "message-username"
    username.style.color = message.member ? message.member.displayHexColor : "#fff"
    username.innerText = message.member ? message.member.displayName : message.author.username
    usernameAndContent.appendChild(username)
    let messageContent = document.createElement("div")
    messageContent.classList = "message-content"
    let messageText = document.createElement("div")
    messageText.classList = "message-text"
    messageText.innerHTML = this.markdownManager.parse(message.content || "")
    messageContent.appendChild(messageText)
    let messageEmbed = document.createElement("div")
    messageEmbed.classList = "embeds"
    this.createEmbeds(message.embeds, messageContent)
    messageContent.appendChild(messageEmbed)
    usernameAndContent.appendChild(messageContent)

    messageObject.appendChild(usernameAndContent)
    if(addToTop) this.messageDom.insertBefore(messageObject, this.messageDom.firstChild)
    else this.messageDom.appendChild(messageObject)
    if(scroll) this.messageDom.scrollTop = this.messageDom.scrollHeight
  }
  editMessage(message) {
    let messageObject = document.getElementById(message.id)
    let messageContent = messageObject.childNodes[1].childNodes[1].childNodes
    // message-text
    messageContent[0].innerHTML = this.markdownManager.parse(message.content || "")
    // message-embed
    this.createEmbeds(message.embeds, messageContent[1])
  }
  createEmbeds(embeds, embedDOM) {
    // TODO: Add embeds
  }
}

class ChannelDOManager {
  constructor() {

  }
}

