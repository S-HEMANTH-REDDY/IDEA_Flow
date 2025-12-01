import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Idea, Comment, Vote } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Navbar } from '@/components/Navbar';
import { ArrowUp, ArrowDown, MessageCircle, Trash2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const IdeaDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [idea, setIdea] = useState<Idea | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [userVote, setUserVote] = useState<'upvote' | 'downvote' | null>(null);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchIdea();
      fetchComments();
      if (user) {
        fetchUserVote();
      }
    }
  }, [id, user]);

  const fetchIdea = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from('ideas')
      .select(`
        *,
        profiles:created_by (email, role),
        categories (name, slug),
        subcategories (name, slug)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching idea:', error);
      toast({
        title: "Error",
        description: "Failed to load idea",
        variant: "destructive"
      });
      return;
    }

    setIdea(data);
    setLoading(false);
  };

  const fetchComments = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles (email, role)
      `)
      .eq('idea_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
      return;
    }

    setComments(data || []);
  };

  const fetchUserVote = async () => {
    if (!id || !user) return;

    const { data, error } = await supabase
      .from('votes')
      .select('vote_type')
      .eq('idea_id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user vote:', error);
      return;
    }

    setUserVote((data?.vote_type as 'upvote' | 'downvote') || null);
  };

  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (!user || !id) {
      toast({
        title: "Sign in required",
        description: "Please sign in to vote on ideas",
        variant: "destructive"
      });
      return;
    }

    try {
      if (userVote === voteType) {
        // Remove vote
        await supabase
          .from('votes')
          .delete()
          .eq('idea_id', id)
          .eq('user_id', user.id);
        setUserVote(null);
      } else if (userVote) {
        // Update existing vote
        await supabase
          .from('votes')
          .update({ vote_type: voteType, updated_at: new Date().toISOString() })
          .eq('idea_id', id)
          .eq('user_id', user.id);
        setUserVote(voteType);
      } else {
        // Create new vote
        await supabase
          .from('votes')
          .insert({
            idea_id: id,
            user_id: user.id,
            vote_type: voteType
          });
        setUserVote(voteType);
      }

      await fetchIdea();
    } catch (error: any) {
      console.error('Error voting:', error);
      toast({
        title: "Error",
        description: "Failed to record vote",
        variant: "destructive"
      });
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !newComment.trim()) return;

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          idea_id: id,
          user_id: user.id,
          content: newComment.trim()
        });

      if (error) throw error;

      setNewComment('');
      await fetchComments();

      toast({
        title: "Comment posted",
        description: "Your comment has been added"
      });
    } catch (error: any) {
      console.error('Error posting comment:', error);
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !profile || profile.role !== 'admin') return;

    try {
      const { error } = await supabase
        .from('ideas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Idea deleted",
        description: "The idea has been removed"
      });

      navigate('/');
    } catch (error: any) {
      console.error('Error deleting idea:', error);
      toast({
        title: "Error",
        description: "Failed to delete idea",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">Idea not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="shadow-lg mb-6">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center gap-2">
                <Button
                  size="lg"
                  variant={userVote === 'upvote' ? 'default' : 'outline'}
                  className={`h-10 w-10 rounded-full ${
                    userVote === 'upvote'
                      ? 'bg-success hover:bg-success/90'
                      : 'hover:bg-success/10 hover:text-success hover:border-success'
                  }`}
                  onClick={() => handleVote('upvote')}
                >
                  <ArrowUp className="h-5 w-5" />
                </Button>
                <span className="text-xl font-bold">{idea.score}</span>
                <Button
                  size="lg"
                  variant={userVote === 'downvote' ? 'destructive' : 'outline'}
                  className={`h-10 w-10 rounded-full ${
                    userVote === 'downvote'
                      ? ''
                      : 'hover:bg-destructive/10 hover:text-destructive hover:border-destructive'
                  }`}
                  onClick={() => handleVote('downvote')}
                >
                  <ArrowDown className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-3">{idea.title}</h1>
                <div className="flex flex-wrap gap-2 mb-3">
                  {idea.categories && (
                    <Badge variant="secondary">{idea.categories.name}</Badge>
                  )}
                  {idea.subcategories && (
                    <Badge variant="outline">{idea.subcategories.name}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Posted by {idea.profiles?.email.split('@')[0]} •{' '}
                  {formatDistanceToNow(new Date(idea.created_at), { addSuffix: true })}
                </p>
              </div>
              {profile?.role === 'admin' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this idea?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the idea and all its comments.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-2">Overview</h2>
              <p className="text-muted-foreground">{idea.short_description}</p>
            </div>
            {idea.long_description && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Detailed Description</h2>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {idea.long_description}
                </p>
              </div>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4 border-t">
              <span className="flex items-center gap-1">
                <ArrowUp className="h-4 w-4 text-success" />
                {idea.total_upvotes} upvotes
              </span>
              <span className="flex items-center gap-1">
                <ArrowDown className="h-4 w-4 text-destructive" />
                {idea.total_downvotes} downvotes
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                {comments.length} comments
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <h2 className="text-xl font-semibold">Comments ({comments.length})</h2>
          </CardHeader>
          <CardContent className="space-y-6">
            {user ? (
              <form onSubmit={handleCommentSubmit} className="space-y-3">
                <Textarea
                  placeholder="Share your thoughts..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  maxLength={1000}
                />
                <Button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="bg-gradient-primary"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Post Comment
                </Button>
              </form>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                <Button variant="link" onClick={() => navigate('/auth')}>
                  Sign in
                </Button>{' '}
                to leave a comment
              </p>
            )}

            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-sm">
                      {comment.profiles?.email.split('@')[0]}
                    </span>
                    {comment.profiles?.role && (
                      <Badge variant="secondary" className="text-xs">
                        {comment.profiles.role}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm">{comment.content}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IdeaDetail;
