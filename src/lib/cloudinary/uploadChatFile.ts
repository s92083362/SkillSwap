// src/lib/cloudinary/uploadChatFile.ts

export async function uploadChatFileToCloudinary(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "chat_unsigned"); // Your preset name

  const cloudName = "drw4jufk2"; // Your cloud name

  // Determine the correct resource type based on file MIME type
  let resourceType = "auto";
  if (file.type.startsWith("image/")) {
    resourceType = "image";
  } else if (file.type.startsWith("video/")) {
    resourceType = "video";
  } else {
    // For PDFs and other files, use 'raw'
    resourceType = "raw";
  }

  // Upload directly to Cloudinary using unsigned upload
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`Cloudinary upload error: ${res.status} ${errorText}`);
  }

  const data = await res.json();

  return {
    url: data.secure_url as string,
    resourceType: data.resource_type as string,
  };
}