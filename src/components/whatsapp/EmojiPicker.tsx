import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: "😀 Rostos",
    emojis: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🫢","🤫","🤔","🫡","🤐","🤨","😐","😑","😶","🫥","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥵","🥶","🥴","😵","🤯","🤠","🥳","🥸","😎","🤓","🧐","😕","🫤","😟","🙁","😮","😯","😲","😳","🥺","🥹","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖"],
  },
  {
    label: "👋 Gestos",
    emojis: ["👋","🤚","🖐️","✋","🖖","🫱","🫲","🫳","🫴","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","🫵","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🧠","🫀","🫁","🦷","🦴","👀","👁️","👅","👄"],
  },
  {
    label: "❤️ Amor",
    emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","♥️","💋","💌","💐","🌹","🥀","💍","💎"],
  },
  {
    label: "🎉 Objetos",
    emojis: ["🎉","🎊","🎈","🎁","🎀","🏆","🥇","🥈","🥉","⚽","🏀","🏈","⚾","🎾","🏐","🎯","🎮","🎲","🔥","⭐","🌟","✨","💫","🌈","☀️","🌤️","⛅","🌥️","☁️","🌧️","⛈️","🌩️","❄️","💧","🌊","🎵","🎶","🔔","📱","💻","⌨️","📷","📹","📞","📧","✉️","📝","📎","📌","📋","📁","🗂️","📅","🕐","⏰","⏳","🔑","🔒","🔓"],
  },
  {
    label: "✅ Símbolos",
    emojis: ["✅","❌","⭕","❗","❓","‼️","⁉️","💯","🔴","🟠","🟡","🟢","🔵","🟣","⚫","⚪","🟤","🔺","🔻","💠","🔘","🏁","🚩","🎌","🏴","🏳️","➡️","⬅️","⬆️","⬇️","↩️","↪️","🔄","🔃","➕","➖","➗","✖️","♾️","💲","💱","©️","®️","™️"],
  },
];

interface Props {
  onEmojiSelect: (emoji: string) => void;
}

export function EmojiPicker({ onEmojiSelect }: Props) {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0 self-end h-10 w-10">
          <Smile className="h-5 w-5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-80 p-0">
        {/* Category tabs */}
        <div className="flex border-b border-border overflow-x-auto">
          {EMOJI_CATEGORIES.map((cat, i) => (
            <button
              key={cat.label}
              onClick={() => setActiveCategory(i)}
              className={`px-2 py-1.5 text-sm whitespace-nowrap transition-colors ${
                activeCategory === i
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.label.split(" ")[0]}
            </button>
          ))}
        </div>
        {/* Emoji grid */}
        <ScrollArea className="h-48">
          <div className="grid grid-cols-8 gap-0.5 p-2">
            {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onEmojiSelect(emoji)}
                className="h-8 w-8 flex items-center justify-center text-lg hover:bg-secondary rounded transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
