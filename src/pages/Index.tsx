import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Idea, Category, Subcategory } from '@/lib/supabase';
import { Navbar } from '@/components/Navbar';
import { IdeaCard } from '@/components/IdeaCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Search, TrendingUp, Flame, Clock, ThumbsUp, Zap } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type RankingType = 'hot' | 'score' | 'upvotes' | 'controversial' | 'newest';

const Index = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, 'upvote' | 'downvote'>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [ranking, setRanking] = useState<RankingType>('hot');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
    fetchSubcategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      const filtered = subcategories.filter(
        (sub) => sub.category_id === selectedCategory
      );
      setFilteredSubcategories(filtered);
      setSelectedSubcategory('');
    } else {
      setFilteredSubcategories([]);
      setSelectedSubcategory('');
    }
  }, [selectedCategory, subcategories]);

  useEffect(() => {
    fetchIdeas();
  }, [ranking, selectedCategory, selectedSubcategory, searchQuery]);

  useEffect(() => {
    if (user) {
      fetchUserVotes();
    }
  }, [user, ideas]);

  useEffect(() => {
    fetchCommentCounts();
  }, [ideas]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    setCategories(data || []);
  };

  const fetchSubcategories = async () => {
    const { data } = await supabase
      .from('subcategories')
      .select('*')
      .order('name');
    setSubcategories(data || []);
  };

  const fetchIdeas = async () => {
    setLoading(true);
    let query = supabase
      .from('ideas')
      .select(`
        *,
        profiles:created_by (email, role),
        categories (name, slug),
        subcategories (name, slug)
      `);

    // Apply filters
    if (selectedCategory) {
      query = query.eq('category_id', selectedCategory);
    }
    if (selectedSubcategory) {
      query = query.eq('subcategory_id', selectedSubcategory);
    }
    if (searchQuery) {
      query = query.or(
        `title.ilike.%${searchQuery}%,short_description.ilike.%${searchQuery}%`
      );
    }

    // Apply ranking
    switch (ranking) {
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'upvotes':
        query = query.order('total_upvotes', { ascending: false });
        break;
      case 'score':
        query = query.order('score', { ascending: false });
        break;
      case 'controversial':
        query = query.order('total_upvotes', { ascending: false });
        break;
      case 'hot':
      default:
        query = query.order('score', { ascending: false });
        break;
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching ideas:', error);
      toast({
        title: "Error",
        description: "Failed to load ideas",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    // For controversial, filter by similar upvotes/downvotes
    let processedData = data || [];
    if (ranking === 'controversial') {
      processedData = processedData.filter(
        (idea) =>
          idea.total_upvotes > 0 &&
          idea.total_downvotes > 0 &&
          Math.abs(idea.total_upvotes - idea.total_downvotes) < 
            Math.min(idea.total_upvotes, idea.total_downvotes) * 0.5
      );
    }

    // For hot ranking, apply time decay
    if (ranking === 'hot') {
      processedData = processedData
        .map((idea) => {
          const hoursOld = (Date.now() - new Date(idea.created_at).getTime()) / (1000 * 60 * 60);
          const hotScore = idea.score / Math.pow(hoursOld + 2, 1.5);
          return { ...idea, hotScore };
        })
        .sort((a, b) => (b as any).hotScore - (a as any).hotScore);
    }

    setIdeas(processedData);
    setLoading(false);
  };

  const fetchUserVotes = async () => {
    if (!user) return;

    const ideaIds = ideas.map((idea) => idea.id);
    if (ideaIds.length === 0) return;

    const { data } = await supabase
      .from('votes')
      .select('idea_id, vote_type')
      .eq('user_id', user.id)
      .in('idea_id', ideaIds);

    const votesMap: Record<string, 'upvote' | 'downvote'> = {};
    data?.forEach((vote) => {
      votesMap[vote.idea_id] = vote.vote_type as 'upvote' | 'downvote';
    });

    setUserVotes(votesMap);
  };

  const fetchCommentCounts = async () => {
    const ideaIds = ideas.map((idea) => idea.id);
    if (ideaIds.length === 0) return;

    const { data } = await supabase
      .from('comments')
      .select('idea_id')
      .in('idea_id', ideaIds);

    const counts: Record<string, number> = {};
    data?.forEach((comment) => {
      counts[comment.idea_id] = (counts[comment.idea_id] || 0) + 1;
    });

    setCommentCounts(counts);
  };

  const handleVote = async (ideaId: string, voteType: 'upvote' | 'downvote') => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to vote on ideas",
        variant: "destructive"
      });
      return;
    }

    try {
      const currentVote = userVotes[ideaId];

      if (currentVote === voteType) {
        // Remove vote
        await supabase
          .from('votes')
          .delete()
          .eq('idea_id', ideaId)
          .eq('user_id', user.id);
        
        const newVotes = { ...userVotes };
        delete newVotes[ideaId];
        setUserVotes(newVotes);
      } else if (currentVote) {
        // Update existing vote
        await supabase
          .from('votes')
          .update({ vote_type: voteType, updated_at: new Date().toISOString() })
          .eq('idea_id', ideaId)
          .eq('user_id', user.id);
        
        setUserVotes({ ...userVotes, [ideaId]: voteType });
      } else {
        // Create new vote
        await supabase
          .from('votes')
          .insert({
            idea_id: ideaId,
            user_id: user.id,
            vote_type: voteType
          });
        
        setUserVotes({ ...userVotes, [ideaId]: voteType });
      }

      // Refetch ideas to update counts
      await fetchIdeas();
    } catch (error: any) {
      console.error('Error voting:', error);
      toast({
        title: "Error",
        description: "Failed to record vote",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Discover Game-Changing Ideas
          </h1>
          <p className="text-muted-foreground">
            Explore, vote, and discuss innovative ideas that could change the world
          </p>
        </div>

        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search ideas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedSubcategory}
              onValueChange={setSelectedSubcategory}
              disabled={!selectedCategory}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Subcategories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">All Subcategories</SelectItem>
                {filteredSubcategories.map((sub) => (
                  <SelectItem key={sub.id} value={sub.id}>
                    {sub.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={ranking} onValueChange={(v) => setRanking(v as RankingType)}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="hot" className="flex items-center gap-1">
                <Flame className="h-3 w-3" />
                Hot
              </TabsTrigger>
              <TabsTrigger value="score" className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Score
              </TabsTrigger>
              <TabsTrigger value="upvotes" className="flex items-center gap-1">
                <ThumbsUp className="h-3 w-3" />
                Top
              </TabsTrigger>
              <TabsTrigger value="controversial" className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Debate
              </TabsTrigger>
              <TabsTrigger value="newest" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                New
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="space-y-4">
          {loading ? (
            <p className="text-center text-muted-foreground py-12">Loading ideas...</p>
          ) : ideas.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              No ideas found. Be the first to submit one!
            </p>
          ) : (
            ideas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                userVote={userVotes[idea.id]}
                onVote={handleVote}
                commentCount={commentCounts[idea.id] || 0}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
