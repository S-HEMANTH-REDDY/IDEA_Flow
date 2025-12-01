import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Category, Subcategory } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Navbar } from '@/components/Navbar';
import { Loader2 } from 'lucide-react';

const Submit = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    shortDescription: '',
    longDescription: '',
    categoryId: '',
    subcategoryId: ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchCategories();
    fetchSubcategories();
  }, []);

  useEffect(() => {
    if (formData.categoryId) {
      const filtered = subcategories.filter(
        (sub) => sub.category_id === formData.categoryId
      );
      setFilteredSubcategories(filtered);
      setFormData((prev) => ({ ...prev, subcategoryId: '' }));
    } else {
      setFilteredSubcategories([]);
    }
  }, [formData.categoryId, subcategories]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      return;
    }

    setCategories(data || []);
  };

  const fetchSubcategories = async () => {
    const { data, error } = await supabase
      .from('subcategories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching subcategories:', error);
      return;
    }

    setSubcategories(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const { error } = await supabase.from('ideas').insert({
        title: formData.title,
        short_description: formData.shortDescription,
        long_description: formData.longDescription || null,
        category_id: formData.categoryId,
        subcategory_id: formData.subcategoryId || null,
        created_by: user.id
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your idea has been submitted."
      });

      navigate('/');
    } catch (error: any) {
      console.error('Error submitting idea:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit idea. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Submit Your Idea</CardTitle>
            <CardDescription>
              Share your innovative idea with the community
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="AI-powered operating system"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortDescription">Short Description *</Label>
                <Textarea
                  id="shortDescription"
                  placeholder="A brief overview of your idea (shown in listings)"
                  value={formData.shortDescription}
                  onChange={(e) =>
                    setFormData({ ...formData, shortDescription: e.target.value })
                  }
                  required
                  maxLength={300}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="longDescription">Detailed Description</Label>
                <Textarea
                  id="longDescription"
                  placeholder="Provide more details about your idea, its potential impact, and implementation"
                  value={formData.longDescription}
                  onChange={(e) =>
                    setFormData({ ...formData, longDescription: e.target.value })
                  }
                  rows={6}
                  maxLength={2000}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, categoryId: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subcategory">Subcategory</Label>
                  <Select
                    value={formData.subcategoryId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, subcategoryId: value })
                    }
                    disabled={!formData.categoryId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSubcategories.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-accent hover:shadow-glow transition-smooth"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Submitting...' : 'Submit Idea'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Submit;
