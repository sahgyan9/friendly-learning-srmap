
import { Switch } from "@/components/ui/switch";

interface SearchToggleProps {
  isEnabled: boolean;
  onChange: (enabled: boolean) => void;
}

const SearchToggle = ({ isEnabled, onChange }: SearchToggleProps) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Enable AI Search</span>
      <Switch 
        checked={isEnabled}
        onCheckedChange={onChange}
        className="data-[state=checked]:bg-primary"
      />
    </div>
  );
};

export default SearchToggle;
