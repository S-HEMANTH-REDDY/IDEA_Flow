import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, MessageCircle } from 'lucide-react';
import { Idea } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

interface IdeaCardProps {
  idea: Idea;
  userVote?: 'upvote' | 'downvote' | null;
  onVote: (ideaId: string, voteType: 'upvote' | 'downvote') => void;
  commentCount?: number;
}

export const IdeaCard = ({ idea, userVote, onVote, commentCount = 0 }: IdeaCardProps) => {
  const navigate = useNavigate();
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (e: React.MouseEvent, voteType: 'upvote' | 'downvote') => {
    e.stopPropagation();
    if (isVoting) return;
    
    setIsVoting(true);
    await onVote(idea.id, voteType);
    setIsVoting(false);
  };

  return (
    <Card
      className="group hover:shadow-lg hover:border-primary/50 transition-all duration-300 cursor-pointer"
      onClick={() => navigate(`/idea/${idea.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center gap-1 min-w-[48px]">
            <Button
              size="sm"
              variant={userVote === 'upvote' ? 'default' : 'outline'}
              className={`h-8 w-8 p-0 ${
                userVote === 'upvote'
                  ? 'bg-success hover:bg-success/90'
                  : 'hover:bg-success/10 hover:text-success hover:border-success'
              }`}
              onClick={(e) => handleVote(e, 'upvote')}
              disabled={isVoting}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <span className="text-sm font-bold text-foreground">{idea.score}</span>
            <Button
              size="sm"
              variant={userVote === 'downvote' ? 'destructive' : 'outline'}
              className={`h-8 w-8 p-0 ${
                userVote === 'downvote'
                  ? ''
                  : 'hover:bg-destructive/10 hover:text-destructive hover:border-destructive'
              }`}
              onClick={(e) => handleVote(e, 'downvote')}
              disabled={isVoting}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-lg font-semibold leading-tight group-hover:text-primary transition-colors">
              {idea.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {idea.short_description}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex flex-wrap gap-2">
          {idea.categories && (
            <Badge variant="secondary" className="text-xs">
              {idea.categories.name}
            </Badge>
          )}
          {idea.subcategories && (
            <Badge variant="outline" className="text-xs">
              {idea.subcategories.name}
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground flex items-center justify-between">
        <span>
          by {idea.profiles?.email.split('@')[0]} •{' '}
          {formatDistanceToNow(new Date(idea.created_at), { addSuffix: true })}
        </span>
        <div className="flex items-center gap-1">
          <MessageCircle className="h-3 w-3" />
          <span>{commentCount}</span>
        </div>
      </CardFooter>
    </Card>
  );
};
