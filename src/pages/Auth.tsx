import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Lightbulb } from 'lucide-react';

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>('student');
  const [loading, setLoading] = useState(false);
  const { signUp, signIn, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      await signUp(email, password, role);
    } else {
      await signIn(email, password);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-md shadow-lg border-border/50">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
              <Lightbulb className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </CardTitle>
          <CardDescription>
            {isSignUp
              ? 'Join the community and share your ideas'
              : 'Sign in to continue sharing and voting'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="transition-smooth"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="transition-smooth"
              />
            </div>
            {isSignUp && (
              <div className="space-y-3">
                <Label>I am a...</Label>
                <RadioGroup value={role} onValueChange={setRole} className="space-y-2">
                  <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:border-primary transition-smooth cursor-pointer">
                    <RadioGroupItem value="student" id="student" />
                    <Label htmlFor="student" className="flex-1 cursor-pointer">
                      <div className="font-medium">Student</div>
                      <div className="text-xs text-muted-foreground">
                        Exploring ideas and learning
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:border-primary transition-smooth cursor-pointer">
                    <RadioGroupItem value="entrepreneur" id="entrepreneur" />
                    <Label htmlFor="entrepreneur" className="flex-1 cursor-pointer">
                      <div className="font-medium">Entrepreneur</div>
                      <div className="text-xs text-muted-foreground">
                        Building and launching ideas
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:border-primary transition-smooth cursor-pointer">
                    <RadioGroupItem value="admin" id="admin" />
                    <Label htmlFor="admin" className="flex-1 cursor-pointer">
                      <div className="font-medium">Admin</div>
                      <div className="text-xs text-muted-foreground">
                        Managing and moderating
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}
            <Button
              type="submit"
              className="w-full bg-gradient-primary hover:shadow-glow transition-smooth"
              disabled={loading}
            >
              {loading ? 'Loading...' : isSignUp ? 'Sign up' : 'Sign in'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary hover:underline"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
