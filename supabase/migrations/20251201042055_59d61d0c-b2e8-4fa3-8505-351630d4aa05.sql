-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'student', 'entrepreneur');

-- Profiles table with role
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Subcategories table
CREATE TABLE public.subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(slug, category_id)
);

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- Ideas table
CREATE TABLE public.ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  short_description TEXT NOT NULL,
  long_description TEXT,
  category_id UUID NOT NULL REFERENCES public.categories(id),
  subcategory_id UUID REFERENCES public.subcategories(id),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_upvotes INTEGER NOT NULL DEFAULT 0,
  total_downvotes INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;

-- Votes table
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(idea_id, user_id)
);

ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX idx_ideas_created_at ON public.ideas(created_at DESC);
CREATE INDEX idx_ideas_score ON public.ideas(score DESC);
CREATE INDEX idx_votes_idea_id ON public.votes(idea_id);
CREATE INDEX idx_comments_idea_id ON public.comments(idea_id);

-- Security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
$$;

-- RLS Policies for profiles
CREATE POLICY "Anyone can view profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for categories
CREATE POLICY "Anyone can view categories" ON public.categories
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage categories" ON public.categories
  FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for subcategories
CREATE POLICY "Anyone can view subcategories" ON public.subcategories
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage subcategories" ON public.subcategories
  FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for ideas
CREATE POLICY "Anyone can view ideas" ON public.ideas
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create ideas" ON public.ideas
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Only admins can delete ideas" ON public.ideas
  FOR DELETE USING (public.is_admin(auth.uid()));

-- RLS Policies for votes
CREATE POLICY "Anyone can view votes" ON public.votes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage own votes" ON public.votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own votes" ON public.votes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes" ON public.votes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for comments
CREATE POLICY "Anyone can view comments" ON public.comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Only admins can delete comments" ON public.comments
  FOR DELETE USING (public.is_admin(auth.uid()));

-- Function to update idea vote counts and score
CREATE OR REPLACE FUNCTION public.update_idea_votes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  upvotes INTEGER;
  downvotes INTEGER;
BEGIN
  -- Count upvotes and downvotes for the idea
  SELECT 
    COUNT(*) FILTER (WHERE vote_type = 'upvote'),
    COUNT(*) FILTER (WHERE vote_type = 'downvote')
  INTO upvotes, downvotes
  FROM public.votes
  WHERE idea_id = COALESCE(NEW.idea_id, OLD.idea_id);
  
  -- Update idea with new counts
  UPDATE public.ideas
  SET 
    total_upvotes = upvotes,
    total_downvotes = downvotes,
    score = upvotes - downvotes
  WHERE id = COALESCE(NEW.idea_id, OLD.idea_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to update idea votes
CREATE TRIGGER update_idea_votes_on_vote_change
  AFTER INSERT OR UPDATE OR DELETE ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_idea_votes();

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student')
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert default categories
INSERT INTO public.categories (name, slug) VALUES
  ('Software Engineering', 'software-engineering'),
  ('Healthcare', 'healthcare'),
  ('Education', 'education'),
  ('Climate & Environment', 'climate-environment'),
  ('Finance', 'finance'),
  ('Entertainment', 'entertainment'),
  ('Social Impact', 'social-impact'),
  ('Hardware', 'hardware');

-- Insert default subcategories
INSERT INTO public.subcategories (name, slug, category_id) VALUES
  -- Software Engineering
  ('AI & Machine Learning', 'ai-ml', (SELECT id FROM public.categories WHERE slug = 'software-engineering')),
  ('DevTools', 'devtools', (SELECT id FROM public.categories WHERE slug = 'software-engineering')),
  ('SaaS', 'saas', (SELECT id FROM public.categories WHERE slug = 'software-engineering')),
  ('Mobile Apps', 'mobile-apps', (SELECT id FROM public.categories WHERE slug = 'software-engineering')),
  -- Healthcare
  ('Telemedicine', 'telemedicine', (SELECT id FROM public.categories WHERE slug = 'healthcare')),
  ('Medical Devices', 'medical-devices', (SELECT id FROM public.categories WHERE slug = 'healthcare')),
  ('Mental Health', 'mental-health', (SELECT id FROM public.categories WHERE slug = 'healthcare')),
  -- Education
  ('EdTech', 'edtech', (SELECT id FROM public.categories WHERE slug = 'education')),
  ('Online Learning', 'online-learning', (SELECT id FROM public.categories WHERE slug = 'education')),
  ('Skills Training', 'skills-training', (SELECT id FROM public.categories WHERE slug = 'education')),
  -- Climate & Environment
  ('Clean Energy', 'clean-energy', (SELECT id FROM public.categories WHERE slug = 'climate-environment')),
  ('Sustainability', 'sustainability', (SELECT id FROM public.categories WHERE slug = 'climate-environment')),
  ('Carbon Capture', 'carbon-capture', (SELECT id FROM public.categories WHERE slug = 'climate-environment')),
  -- Finance
  ('FinTech', 'fintech', (SELECT id FROM public.categories WHERE slug = 'finance')),
  ('Crypto & Web3', 'crypto-web3', (SELECT id FROM public.categories WHERE slug = 'finance')),
  ('Payments', 'payments', (SELECT id FROM public.categories WHERE slug = 'finance')),
  -- Entertainment
  ('Gaming', 'gaming', (SELECT id FROM public.categories WHERE slug = 'entertainment')),
  ('Content Creation', 'content-creation', (SELECT id FROM public.categories WHERE slug = 'entertainment')),
  ('Social Media', 'social-media', (SELECT id FROM public.categories WHERE slug = 'entertainment')),
  -- Social Impact
  ('Non-Profit', 'non-profit', (SELECT id FROM public.categories WHERE slug = 'social-impact')),
  ('Community Building', 'community-building', (SELECT id FROM public.categories WHERE slug = 'social-impact')),
  ('Accessibility', 'accessibility', (SELECT id FROM public.categories WHERE slug = 'social-impact')),
  -- Hardware
  ('IoT', 'iot', (SELECT id FROM public.categories WHERE slug = 'hardware')),
  ('Robotics', 'robotics', (SELECT id FROM public.categories WHERE slug = 'hardware')),
  ('Consumer Electronics', 'consumer-electronics', (SELECT id FROM public.categories WHERE slug = 'hardware'));