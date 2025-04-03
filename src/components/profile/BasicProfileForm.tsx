
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BasicProfileFormProps {
  name: string;
  email: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const BasicProfileForm = ({ name, email, onChange }: BasicProfileFormProps) => {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <Label htmlFor="name">Full name</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={onChange}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          value={email}
          disabled
          className="bg-muted"
        />
      </div>
    </div>
  );
};

export default BasicProfileForm;
