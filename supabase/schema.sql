-- Create custom types / enums
CREATE TYPE user_plan AS ENUM ('free', 'byok', 'pro');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'unpaid');
CREATE TYPE provider_type AS ENUM ('gemini', 'openai', 'anthropic');

-- 1. PROFILES Table (linked to auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    plan user_plan DEFAULT 'free'::user_plan,
    generation_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- 2. CV DOCUMENTS Table (user uploaded resumes)
CREATE TABLE public.cv_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    filename TEXT NOT NULL,
    extracted_text TEXT NOT NULL,
    storage_path TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for CV Documents
ALTER TABLE public.cv_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can perform all actions on own CVs" 
    ON public.cv_documents FOR ALL 
    USING (auth.uid() = user_id);

-- 3. GENERATIONS Table (CV customize logs & results)
CREATE TABLE public.generations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    job_description TEXT NOT NULL,
    aspirations TEXT,
    target_length TEXT NOT NULL,
    cv_markdown TEXT NOT NULL,
    cover_letter TEXT,
    ats_score INTEGER,
    ats_analysis JSONB,
    human_changes JSONB,
    provider_used TEXT,
    model_used TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Generations
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generations" 
    ON public.generations FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own generations" 
    ON public.generations FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 4. SUBSCRIPTIONS Table (Lemon Squeezy integration)
CREATE TABLE public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    lemon_squeezy_id TEXT UNIQUE NOT NULL,
    status subscription_status NOT NULL,
    plan user_plan NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" 
    ON public.subscriptions FOR SELECT 
    USING (auth.uid() = user_id);

-- 5. USER API KEYS Table (BYOK - Encrypted at rest via pgsodium/vault)
CREATE TABLE public.user_api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    provider provider_type NOT NULL,
    encrypted_key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, provider)
);

-- Enable RLS for User API Keys
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own API keys" 
    ON public.user_api_keys FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own API keys" 
    ON public.user_api_keys FOR ALL 
    USING (auth.uid() = user_id);

-- TRIGGER FUNCTION to automatically insert profile on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, plan)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
        new.raw_user_meta_data->>'avatar_url',
        'free'::user_plan
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger assignment
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
