import { supabase } from '../lib/supabase';
import fs from 'fs';
import path from 'path';

export class StorageManager {
    private bucketName = 'audio';

    constructor() {
        // Optional: check if bucket exists, but no creation logic
        this.checkBucketExists();
    }

    private async checkBucketExists() {
        try {
            const { data: buckets, error } = await supabase.storage.listBuckets();
            if (error) throw error;

            const exists = buckets?.some(b => b.name === this.bucketName);
            if (!exists) {
                console.warn(`Bucket "${this.bucketName}" does not exist. Please create it manually in Supabase.`);
            } else {
                console.log('✅ Audio bucket found.');
            }
        } catch (error) {
            console.error('❌ Error checking bucket existence:', error);
        }
    }

    async uploadAudio(filePath: string): Promise<string> {
        try {
            const fileName = path.basename(filePath);
            const fileBuffer = fs.readFileSync(filePath);

            const { data, error } = await supabase.storage
                .from(this.bucketName)
                .upload(fileName, fileBuffer, {
                    contentType: 'audio/wav',
                    cacheControl: '3600',
                    upsert: true,
                });

            if (error) {
                console.error('❌ Upload error:', error);
                throw error;
            }

            const { data: { publicUrl } } = supabase.storage
                .from(this.bucketName)
                .getPublicUrl(fileName);

            return publicUrl;
        } catch (error) {
            console.error('❌ Error uploading audio:', error);
            throw error;
        }
    }

    async deleteAudio(fileName: string): Promise<void> {
        try {
            const { error } = await supabase.storage
                .from(this.bucketName)
                .remove([fileName]);

            if (error) {
                console.error('❌ Delete error:', error);
                throw error;
            }

            console.log(`🗑️ Deleted: ${fileName}`);
        } catch (error) {
            console.error('❌ Error deleting audio:', error);
            throw error;
        }
    }
}
