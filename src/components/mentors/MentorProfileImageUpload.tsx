
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { v4 as uuidv4 } from 'uuid';
import AvatarCropDialog from "@/components/profile/AvatarCropDialog";
import { downscaleImage } from "@/lib/image/downscale";

interface MentorProfileImageUploadProps {
  profileImage: string;
  name: string;
  userId: string | undefined;
  onImageUploaded: (imageUrl: string) => void;
}

const MentorProfileImageUpload = ({
  profileImage,
  name,
  userId,
  onImageUploaded,
}: MentorProfileImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  /** Chosen but not yet positioned. Non-null means the cropper is open. */
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  /** Opens the cropper. The crop is what gets uploaded — see handleCropped. */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Cleared so re-picking the same file after a cancel still fires a change.
    e.target.value = "";
    if (!file || !userId) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }

    setPendingImage(file);
  };

  const handleCropped = async (cropped: File) => {
    if (!userId) return;

    try {
      setUploading(true);

      const file = await downscaleImage(cropped);

      // Generate a unique file name to avoid collisions
      const fileExt = file.name.split('.').pop();
      const fileName = `profile-images/${userId}-${uuidv4()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('profiles')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error("Error uploading image:", error);
        toast.error("Failed to upload profile image");
        return;
      }
      
      // Get the public URL for the uploaded image
      const { data: publicUrlData } = supabase.storage
        .from('profiles')
        .getPublicUrl(fileName);
        
      if (publicUrlData) {
        onImageUploaded(publicUrlData.publicUrl);
        setPendingImage(null);
        toast.success("Profile image uploaded successfully");
      }
    } catch (error: any) {
      console.error("Unexpected error uploading image:", error);
      toast.error(error.message || "Error uploading image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center mb-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />
      <div 
        className="relative cursor-pointer group"
        onClick={handleImageClick}
      >
        <Avatar className="h-24 w-24 border-2 border-primary">
          <AvatarImage src={profileImage} alt="Profile" />
          <AvatarFallback className="text-lg">
            {name?.charAt(0) || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Upload className="h-8 w-8 text-white" />
        </div>
        {uploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground mt-2">
        Click to upload profile picture
      </p>

      <AvatarCropDialog
        file={pendingImage}
        saving={uploading}
        onCancel={() => setPendingImage(null)}
        onCropped={handleCropped}
      />
    </div>
  );
};

export default MentorProfileImageUpload;
