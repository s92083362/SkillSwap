// src/lib/cloudinary/uploadChatFile.ts

export async function uploadChatFileToCloudinary(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "chat_unsigned"); // unsigned preset

  const cloudName = "drw4jufk2";

  // ✅ Decide resource type correctly
  let resourceType: "image" | "video" | "raw" = "raw";

  if (file.type.startsWith("image/")) {
    resourceType = "image";
  } else if (file.type.startsWith("video/")) {
    resourceType = "video";
  } else {
    // PDFs, DOC, DOCX, ZIP, TXT, etc.
    resourceType = "raw";
  }

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
    resourceType: data.resource_type as "image" | "video" | "raw",
    format: data.format as string,
    publicId: data.public_id as string,
  };
}
