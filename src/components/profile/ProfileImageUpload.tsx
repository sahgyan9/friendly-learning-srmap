
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera } from "lucide-react";

interface ProfileImageUploadProps {
  profileImage: string;
  name: string;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ProfileImageUpload = ({ profileImage, name, onImageChange }: ProfileImageUploadProps) => {
  return (
    <div className="flex flex-col items-center mb-8">
      <div className="relative">
        <Avatar className="w-32 h-32">
          <AvatarImage src={profileImage} alt={name} />
          <AvatarFallback>{name?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
        </Avatar>
        <label 
          htmlFor="profile-image"
          className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
        >
          <Camera className="h-4 w-4" />
          <input
            type="file"
            id="profile-image"
            className="hidden"
            accept="image/*"
            onChange={onImageChange}
          />
        </label>
      </div>
      <p className="text-sm text-muted-foreground mt-2">
        Click the camera icon to upload a new photo
      </p>
    </div>
  );
};

export default ProfileImageUpload;
