/**
 * Curated emoji set for the picker — deliberately hand-maintained rather than a
 * dependency: emoji are plain unicode text, so a library would add weight
 * without adding capability. Keywords power the search box.
 */
export interface EmojiEntry {
  char: string
  name: string
  keywords?: string
}

export interface EmojiCategory {
  id: string
  label: string
  emoji: EmojiEntry[]
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'smileys',
    label: 'Smileys',
    emoji: [
      { char: '😀', name: 'grinning' }, { char: '😃', name: 'smiley' },
      { char: '😄', name: 'smile' }, { char: '😁', name: 'grin' },
      { char: '😆', name: 'laughing', keywords: 'haha' }, { char: '😅', name: 'sweat smile' },
      { char: '🤣', name: 'rofl', keywords: 'rolling laughing' }, { char: '😂', name: 'joy', keywords: 'tears laugh cry' },
      { char: '🙂', name: 'slight smile' }, { char: '🙃', name: 'upside down' },
      { char: '😉', name: 'wink' }, { char: '😊', name: 'blush' },
      { char: '😇', name: 'innocent', keywords: 'halo angel' }, { char: '🥰', name: 'smiling hearts', keywords: 'love' },
      { char: '😍', name: 'heart eyes', keywords: 'love' }, { char: '🤩', name: 'star struck', keywords: 'wow' },
      { char: '😘', name: 'kiss' }, { char: '😋', name: 'yum', keywords: 'tasty' },
      { char: '😜', name: 'tongue wink' }, { char: '🤪', name: 'zany', keywords: 'crazy' },
      { char: '🤗', name: 'hug' }, { char: '🤭', name: 'hand over mouth', keywords: 'oops' },
      { char: '🤫', name: 'shush', keywords: 'quiet' }, { char: '🤔', name: 'thinking', keywords: 'hmm' },
      { char: '🤨', name: 'raised eyebrow', keywords: 'suspicious' }, { char: '😐', name: 'neutral' },
      { char: '😑', name: 'expressionless' }, { char: '😶', name: 'no mouth', keywords: 'speechless' },
      { char: '😏', name: 'smirk' }, { char: '😒', name: 'unamused' },
      { char: '🙄', name: 'eye roll' }, { char: '😬', name: 'grimace', keywords: 'awkward' },
      { char: '😴', name: 'sleeping', keywords: 'zzz tired' }, { char: '😪', name: 'sleepy' },
      { char: '😌', name: 'relieved' }, { char: '😔', name: 'pensive', keywords: 'sad' },
      { char: '😕', name: 'confused' }, { char: '🙁', name: 'frown' },
      { char: '😞', name: 'disappointed' }, { char: '😟', name: 'worried' },
      { char: '😢', name: 'cry', keywords: 'sad tear' }, { char: '😭', name: 'sob', keywords: 'crying sad' },
      { char: '😤', name: 'triumph', keywords: 'huff' }, { char: '😠', name: 'angry' },
      { char: '😡', name: 'rage', keywords: 'mad furious' }, { char: '🤯', name: 'mind blown', keywords: 'exploding head' },
      { char: '😳', name: 'flushed', keywords: 'embarrassed' }, { char: '🥵', name: 'hot' },
      { char: '🥶', name: 'cold' }, { char: '😱', name: 'scream', keywords: 'shocked fear' },
      { char: '😨', name: 'fearful' }, { char: '😰', name: 'anxious' },
      { char: '😅', name: 'nervous' }, { char: '🤢', name: 'nauseated', keywords: 'sick' },
      { char: '🤮', name: 'vomit' }, { char: '🤧', name: 'sneeze' },
      { char: '😷', name: 'mask' }, { char: '🤒', name: 'sick', keywords: 'thermometer' },
      { char: '🤕', name: 'injured' }, { char: '🥳', name: 'partying', keywords: 'celebrate' },
      { char: '🥺', name: 'pleading', keywords: 'puppy eyes' }, { char: '😎', name: 'sunglasses', keywords: 'cool' },
      { char: '🤓', name: 'nerd' }, { char: '🧐', name: 'monocle' },
      { char: '😈', name: 'devil', keywords: 'evil' }, { char: '💀', name: 'skull', keywords: 'dead' },
      { char: '👻', name: 'ghost' }, { char: '🤖', name: 'robot', keywords: 'bot' },
      { char: '🎃', name: 'jack o lantern', keywords: 'halloween' },
    ],
  },
  {
    id: 'gestures',
    label: 'People',
    emoji: [
      { char: '👍', name: 'thumbs up', keywords: 'yes approve good like +1' },
      { char: '👎', name: 'thumbs down', keywords: 'no disapprove bad -1' },
      { char: '👌', name: 'ok hand', keywords: 'perfect' }, { char: '🤌', name: 'pinched fingers' },
      { char: '✌️', name: 'victory', keywords: 'peace' }, { char: '🤞', name: 'fingers crossed', keywords: 'hope luck' },
      { char: '🤟', name: 'love you' }, { char: '🤘', name: 'rock on' },
      { char: '🤙', name: 'call me' }, { char: '👈', name: 'point left' },
      { char: '👉', name: 'point right' }, { char: '👆', name: 'point up' },
      { char: '👇', name: 'point down' }, { char: '☝️', name: 'index up' },
      { char: '✋', name: 'raised hand', keywords: 'stop high five' }, { char: '🤚', name: 'back of hand' },
      { char: '🖐️', name: 'hand splayed' }, { char: '🖖', name: 'vulcan' },
      { char: '👋', name: 'wave', keywords: 'hello hi bye' }, { char: '🤝', name: 'handshake', keywords: 'deal agree' },
      { char: '👏', name: 'clap', keywords: 'applause bravo' }, { char: '🙌', name: 'raised hands', keywords: 'celebrate praise' },
      { char: '👐', name: 'open hands' }, { char: '🤲', name: 'palms up' },
      { char: '🙏', name: 'pray', keywords: 'please thanks thank you' }, { char: '✍️', name: 'writing' },
      { char: '💪', name: 'muscle', keywords: 'strong flex' }, { char: '🦾', name: 'mechanical arm' },
      { char: '🧠', name: 'brain', keywords: 'smart' }, { char: '👀', name: 'eyes', keywords: 'look watching' },
      { char: '👶', name: 'baby' }, { char: '🧑', name: 'person' },
      { char: '👨‍💻', name: 'man technologist', keywords: 'developer coding' },
      { char: '👩‍💻', name: 'woman technologist', keywords: 'developer coding' },
      { char: '🕵️', name: 'detective', keywords: 'investigate' }, { char: '💃', name: 'dancing' },
      { char: '🕺', name: 'man dancing' }, { char: '🦸', name: 'superhero' },
    ],
  },
  {
    id: 'symbols',
    label: 'Symbols',
    emoji: [
      { char: '❤️', name: 'red heart', keywords: 'love' }, { char: '🧡', name: 'orange heart' },
      { char: '💛', name: 'yellow heart' }, { char: '💚', name: 'green heart' },
      { char: '💙', name: 'blue heart' }, { char: '💜', name: 'purple heart' },
      { char: '🖤', name: 'black heart' }, { char: '🤍', name: 'white heart' },
      { char: '💔', name: 'broken heart' }, { char: '💯', name: 'hundred', keywords: 'perfect score' },
      { char: '💥', name: 'boom', keywords: 'explosion' }, { char: '✨', name: 'sparkles', keywords: 'shiny magic' },
      { char: '⭐', name: 'star' }, { char: '🌟', name: 'glowing star' },
      { char: '⚡', name: 'zap', keywords: 'lightning fast' }, { char: '🔥', name: 'fire', keywords: 'lit hot' },
      { char: '🎉', name: 'tada', keywords: 'party celebrate' }, { char: '🎊', name: 'confetti' },
      { char: '🏆', name: 'trophy', keywords: 'win award' }, { char: '🥇', name: 'first place', keywords: 'gold' },
      { char: '🎯', name: 'target', keywords: 'bullseye goal' }, { char: '🚀', name: 'rocket', keywords: 'launch ship fast' },
      { char: '✅', name: 'check', keywords: 'done yes complete' }, { char: '☑️', name: 'ballot check' },
      { char: '❌', name: 'cross', keywords: 'no wrong fail' }, { char: '⚠️', name: 'warning', keywords: 'caution' },
      { char: '🚨', name: 'siren', keywords: 'alert urgent' }, { char: '❓', name: 'question' },
      { char: '❗', name: 'exclamation' }, { char: '💬', name: 'speech balloon', keywords: 'comment' },
      { char: '👏', name: 'applause' }, { char: '🔒', name: 'lock', keywords: 'secure private' },
      { char: '🔑', name: 'key' }, { char: '🔔', name: 'bell', keywords: 'notification' },
      { char: '📌', name: 'pin', keywords: 'important' }, { char: '📍', name: 'location' },
      { char: '🕐', name: 'clock', keywords: 'time' }, { char: '⏰', name: 'alarm', keywords: 'deadline' },
      { char: '📅', name: 'calendar', keywords: 'date schedule' }, { char: '📈', name: 'chart up', keywords: 'growth' },
      { char: '📉', name: 'chart down', keywords: 'decline' }, { char: '💡', name: 'bulb', keywords: 'idea' },
    ],
  },
  {
    id: 'objects',
    label: 'Objects',
    emoji: [
      { char: '💻', name: 'laptop', keywords: 'computer' }, { char: '🖥️', name: 'desktop' },
      { char: '⌨️', name: 'keyboard' }, { char: '🖱️', name: 'mouse' },
      { char: '📱', name: 'phone', keywords: 'mobile' }, { char: '🖨️', name: 'printer' },
      { char: '💾', name: 'floppy', keywords: 'save' }, { char: '📷', name: 'camera' },
      { char: '🎥', name: 'movie camera', keywords: 'video' }, { char: '🎧', name: 'headphones', keywords: 'music' },
      { char: '📢', name: 'loudspeaker', keywords: 'announce' }, { char: '📣', name: 'megaphone' },
      { char: '📝', name: 'memo', keywords: 'note write' }, { char: '📄', name: 'document', keywords: 'file page' },
      { char: '📊', name: 'bar chart', keywords: 'data' }, { char: '📁', name: 'folder' },
      { char: '📎', name: 'paperclip', keywords: 'attach' }, { char: '✂️', name: 'scissors', keywords: 'cut' },
      { char: '🔍', name: 'magnifier', keywords: 'search find' }, { char: '🔧', name: 'wrench', keywords: 'fix tool' },
      { char: '🔨', name: 'hammer', keywords: 'build' }, { char: '🛠️', name: 'tools' },
      { char: '⚙️', name: 'gear', keywords: 'settings config' }, { char: '🧪', name: 'test tube', keywords: 'experiment' },
      { char: '🐛', name: 'bug', keywords: 'issue defect' }, { char: '☕', name: 'coffee' },
      { char: '🍕', name: 'pizza' }, { char: '🍔', name: 'burger' },
      { char: '🎂', name: 'cake', keywords: 'birthday' }, { char: '🍻', name: 'beers', keywords: 'cheers' },
      { char: '🌮', name: 'taco' }, { char: '🍿', name: 'popcorn' },
      { char: '🏠', name: 'house', keywords: 'home' }, { char: '🏢', name: 'office', keywords: 'building work' },
      { char: '✈️', name: 'airplane', keywords: 'travel flight' }, { char: '🚗', name: 'car' },
      { char: '🌍', name: 'globe', keywords: 'world earth' }, { char: '☀️', name: 'sun' },
      { char: '🌙', name: 'moon', keywords: 'night' }, { char: '☔', name: 'rain' },
      { char: '❄️', name: 'snowflake', keywords: 'cold' }, { char: '🌈', name: 'rainbow' },
    ],
  },
]

/** Defaults offered before the user has picked anything (also the reaction quick-bar). */
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '👀', '🚀', '✅', '😢']

const ALL_EMOJI: EmojiEntry[] = EMOJI_CATEGORIES.flatMap((c) => c.emoji)

export function searchEmoji(query: string): EmojiEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return ALL_EMOJI.filter((e) => e.name.includes(q) || e.keywords?.includes(q)).slice(0, 60)
}
