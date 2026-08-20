import { useState } from "react";
import { Camera, Loader2, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AvatarCropDialog from "@/components/profile/AvatarCropDialog";
import { downscaleImage } from "@/lib/image/downscale";
import { storagePathFromPublicUrl } from "@/lib/image/storage-path";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfileAvatarUploaderProps {
  userId: string;
  name: string;
  profileImage: string;
  onImageUpdated: (newImageUrl: string) => void;
}

export function ProfileAvatarUploader({
  userId,
  name,
  profileImage,
  onImageUpdated,
}: ProfileAvatarUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [pendingImage, setPendingImage] = useState<File | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setPendingImage(file);
  };

  const handleCropped = async (cropped: File) => {
    setIsUploading(true);
    const previousImageUrl = profileImage;

    try {
      const file = await downscaleImage(cropped);
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `profile-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("profiles")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("profiles")
        .getPublicUrl(filePath);

      const imageUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from("users")
        .update({ profile_image: imageUrl })
        .eq("id", userId);

      if (updateError) throw updateError;

      onImageUpdated(imageUrl);
      setPendingImage(null);
      toast.success("Profile picture updated successfully!");

      if (previousImageUrl) {
        const oldPath = storagePathFromPublicUrl("profiles", previousImageUrl);
        if (oldPath) {
          const { error: removeError } = await supabase.storage.from("profiles").remove([oldPath]);
          if (removeError) console.error("Error removing old profile image:", removeError);
        }
      }
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error(error.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2) || "U";

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Profile Picture
          </CardTitle>
          <CardDescription>
            Upload a profile picture to personalize your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-32 w-32 border-4 border-border">
              <AvatarImage
                src={profileImage}
                alt={name}
                className="object-cover"
              />
              <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col items-center gap-2">
              <Label htmlFor="profile-image" className="cursor-pointer">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUploading}
                  onClick={() => document.getElementById("profile-image")?.click()}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Picture
                    </>
                  )}
                </Button>
              </Label>
              <Input
                id="profile-image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={isUploading}
              />
              <p className="text-xs text-muted-foreground">
                JPG, PNG or GIF (max 5MB) — you'll get to position it
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AvatarCropDialog
        file={pendingImage}
        saving={isUploading}
        onCancel={() => setPendingImage(null)}
        onCropped={handleCropped}
      />
    </>
  );
}
