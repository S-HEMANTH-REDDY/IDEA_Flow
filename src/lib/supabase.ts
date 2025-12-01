import { supabase } from "@/integrations/supabase/client";

export { supabase };

export type AppRole = 'admin' | 'student' | 'entrepreneur';

export interface Profile {
  id: string;
  email: string;
  role: AppRole;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Subcategory {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  created_at: string;
}

export interface Idea {
  id: string;
  title: string;
  short_description: string;
  long_description?: string;
  category_id: string;
  subcategory_id?: string;
  created_by: string;
  created_at: string;
  total_upvotes: number;
  total_downvotes: number;
  score: number;
  profiles?: Partial<Profile>;
  categories?: Partial<Category>;
  subcategories?: Partial<Subcategory>;
}

export interface Vote {
  id: string;
  idea_id: string;
  user_id: string;
  vote_type: 'upvote' | 'downvote';
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  idea_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: Partial<Profile>;
}
