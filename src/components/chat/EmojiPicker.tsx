
import React, { useState } from "react";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
}

// Curated emoji groups
const EMOJI_GROUPS = [
  {
    label: "Smileys",
    emojis: ["😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🤩","🥳","😏","😒","😞","😔","😟","😕","🙁","☹️","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬","🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤗","🤔","🤭","🤫","🤥","😶","😐","😑","😬","🙄","😯","😦","😧","😮","😲","🥱","😴","🤤","😪","😵","🤐","🥴","🤢","🤮","🤧","😷","🤒","🤕"],
  },
  {
    label: "Gestures",
    emojis: ["👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","💪","🦾","🤳","💅","🦵","🦶","👂","🦻","👃","🧠","🫀","🫁","🦷","🦴","👀","👁️","👅","👄","💋","🩸"],
  },
  {
    label: "Hearts",
    emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","❤️‍🔥","❤️‍🩹","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","♥️","🫶","💌","💋"],
  },
  {
    label: "Symbols",
    emojis: ["✅","❌","⭕","🚫","💯","💢","♻️","✨","🔥","💥","🎉","🎊","🎈","🏆","🥇","🎯","💡","🔑","⚡","🌈","🎶","🎵","📌","📍","💬","💭","🗨️","🗯️","📢","📣","🔔","🔕","🔊","🔇","💤","🆕","🆙","🆒","🆓","🆖","🅰️","🅱️","🆎","🅾️","🆑"],
  },
  {
    label: "Animals",
    emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐔","🐧","🐦","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🦟","🦗","🕷️","🦂","🐢","🐍","🦎","🦕","🦖","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🦧","🦣","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🦬","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🦙","🐐","🦌","🐕","🐩","🦮","🐕‍🦺","🐈","🐈‍⬛","🪶","🐓","🦃","🦤","🦚","🦜","🦢","🦩","🕊️","🐇","🦝","🦨","🦡","🦫","🦦","🦥","🐁","🐀","🐿️","🦔"],
  },
  {
    label: "Food",
    emojis: ["🍎","🍊","🍋","🍇","🍓","🍑","🍒","🍍","🥭","🍉","🍌","🍐","🫐","🍈","🍏","🥝","🍅","🫒","🥥","🥑","🍆","🥔","🥕","🌽","🌶️","🫑","🥒","🥬","🥦","🧄","🧅","🍄","🥜","🌰","🍞","🥐","🥖","🫓","🥨","🥯","🥞","🧇","🧀","🍖","🍗","🥩","🥓","🌭","🍔","🍟","🍕","🫔","🌮","🌯","🥗","🥘","🫕","🥫","🍝","🍜","🍲","🍛","🍣","🍱","🥟","🦪","🍤","🍙","🍚","🍘","🍥","🥮","🍢","🧆","🥚","🍳","🥘","🫙","🧈","🥞","🧇"],
  },
];

const EmojiPicker = ({ onEmojiSelect, disabled }: EmojiPickerProps) => {
  const [open, setOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState(0);

  const handleSelect = (emoji: string) => {
    onEmojiSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          className={cn(
            "mb-0.5 h-8 w-8 shrink-0 rounded-xl transition-colors duration-200",
            open
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
          aria-label="Open emoji picker"
        >
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className={cn(
          "w-80 p-0 overflow-hidden rounded-2xl",
          "border border-border bg-popover/95 dark:border-white/15 dark:bg-card/95 shadow-2xl shadow-black/20 backdrop-blur-xl",
        )}
      >
        {/* Group tabs */}
        <div className="flex gap-0.5 border-b border-border/70 dark:border-white/8 p-2">
          {EMOJI_GROUPS.map((group, i) => (
            <button
              key={group.label}
              type="button"
              onClick={() => setActiveGroup(i)}
              title={group.label}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-sm transition-colors duration-150",
                activeGroup === i
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground/50 hover:bg-white/5 hover:text-muted-foreground",
              )}
            >
              {group.emojis[0]}
            </button>
          ))}
        </div>

        {/* Label */}
        <div className="px-3 pb-1 pt-2">
          <p className="text-3xs font-semibold uppercase tracking-widest text-muted-foreground/50">
            {EMOJI_GROUPS[activeGroup].label}
          </p>
        </div>

        {/* Emoji grid */}
        <div className="h-52 overflow-y-auto px-2 pb-2 overscroll-contain">
          <div className="grid grid-cols-9 gap-0.5">
            {EMOJI_GROUPS[activeGroup].emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleSelect(emoji)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-xl transition-colors duration-100 hover:bg-white/8 active:scale-90"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPicker;
