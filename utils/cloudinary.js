export async function uploadToCloudinary(imageUri) {
  const CLOUD_NAME = 'dhzecuia4';
  const UPLOAD_PRESET = 'my_unsigned_preset';

  if (!imageUri) {
    throw new Error('No image URI provided');
  }

  const formData = new FormData();
  // For React Native, we need to handle the file differently than in the browser
  const filename = imageUri.split('/').pop();
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image`;

  formData.append('file', {
    uri: imageUri,
    name: filename,
    type: type,
  });
  formData.append('upload_preset', UPLOAD_PRESET);

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const data = await response.json();

    if (data.secure_url) {
      return data.secure_url;
    } else {
      console.error('Cloudinary Response:', data);
      throw new Error('Upload failed: ' + (data.error?.message || 'No secure_url returned'));
    }
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
}
