
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MentorFormData } from "@/hooks/useMentorForm";
import { useState } from "react";

interface MentorPersonalInfoProps {
  formData: MentorFormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const departments = [
  "Computer Science",
  "Electrical Engineering", 
  "Mechanical Engineering",
  "Civil Engineering",
  "Business Administration",
  "Physics",
  "Mathematics",
  "Chemistry",
  "Biology"
];

const MentorPersonalInfo = ({ formData, handleChange }: MentorPersonalInfoProps) => {
  const [open, setOpen] = useState(false);

  const handleDepartmentSelect = (value: string) => {
    const syntheticEvent = {
      target: {
        name: 'department',
        value: value,
      },
    } as React.ChangeEvent<HTMLSelectElement>;
    
    handleChange(syntheticEvent);
    setOpen(false);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="Your full name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="department">Department <span className="text-red-500">*</span></Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {formData.department || "Select or type department..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput 
                placeholder="Search or type department..." 
                value={formData.department}
                onValueChange={(value) => handleDepartmentSelect(value)}
              />
              <CommandList>
                <CommandEmpty>
                  <div className="p-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => handleDepartmentSelect(formData.department)}
                    >
                      Use "{formData.department}"
                    </Button>
                  </div>
                </CommandEmpty>
                <CommandGroup>
                  {departments.map((department) => (
                    <CommandItem
                      key={department}
                      value={department}
                      onSelect={() => handleDepartmentSelect(department)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          formData.department === department ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {department}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default MentorPersonalInfo;
