'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

export default function CreateEventPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    titleEn: '',
    titlePt: '',
    descriptionEn: '',
    descriptionPt: '',
    category: 'webinar',
    date: '',
    location: 'Online',
    isOnline: true,
    maxAttendees: 100,
    registrationUrl: '',
    imageUrl: '',
    published: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin')) {
      toast({
        title: 'Unauthorized',
        description: 'You do not have permission to create events',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.titleEn || !formData.descriptionEn || !formData.date) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title: {
            en: formData.titleEn,
            pt: formData.titlePt || formData.titleEn,
          },
          description: {
            en: formData.descriptionEn,
            pt: formData.descriptionPt || formData.descriptionEn,
          },
          category: formData.category,
          date: formData.date,
          location: formData.location,
          isOnline: formData.isOnline,
          maxAttendees: formData.maxAttendees,
          registrationUrl: formData.registrationUrl,
          imageUrl: formData.imageUrl,
          published: formData.published,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Event created successfully',
        });
        router.push('/admin/events');
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to create event',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while creating the event',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!user || (user.role !== 'Admin' && user.role !== 'Super Admin')) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Create Event</h1>
              <p className="text-gray-600 dark:text-gray-300">Fill in the event details</p>
            </div>

            <form onSubmit={handleSubmit}>
              <Card>
                <CardHeader>
                  <CardTitle>Event Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="titleEn">Title (English) *</Label>
                      <Input
                        id="titleEn"
                        value={formData.titleEn}
                        onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                        placeholder="Event title in English"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="titlePt">Title (Portuguese)</Label>
                      <Input
                        id="titlePt"
                        value={formData.titlePt}
                        onChange={(e) => setFormData({ ...formData, titlePt: e.target.value })}
                        placeholder="Event title in Portuguese"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="descriptionEn">Description (English) *</Label>
                      <Textarea
                        id="descriptionEn"
                        value={formData.descriptionEn}
                        onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                        placeholder="Event description in English"
                        rows={4}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="descriptionPt">Description (Portuguese)</Label>
                      <Textarea
                        id="descriptionPt"
                        value={formData.descriptionPt}
                        onChange={(e) => setFormData({ ...formData, descriptionPt: e.target.value })}
                        placeholder="Event description in Portuguese"
                        rows={4}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="webinar">Webinar</SelectItem>
                          <SelectItem value="workshop">Workshop</SelectItem>
                          <SelectItem value="meetup">Meetup</SelectItem>
                          <SelectItem value="competition">Competition</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Date & Time *</Label>
                      <Input
                        id="date"
                        type="datetime-local"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Location *</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="Event location"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxAttendees">Max Attendees</Label>
                      <Input
                        id="maxAttendees"
                        type="number"
                        value={formData.maxAttendees}
                        onChange={(e) => setFormData({ ...formData, maxAttendees: parseInt(e.target.value) })}
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registrationUrl">Registration URL</Label>
                    <Input
                      id="registrationUrl"
                      type="url"
                      value={formData.registrationUrl}
                      onChange={(e) => setFormData({ ...formData, registrationUrl: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="imageUrl">Image URL</Label>
                    <Input
                      id="imageUrl"
                      type="url"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isOnline"
                        checked={formData.isOnline}
                        onCheckedChange={(checked) => setFormData({ ...formData, isOnline: checked })}
                      />
                      <Label htmlFor="isOnline">Online Event</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="published"
                        checked={formData.published}
                        onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
                      />
                      <Label htmlFor="published">Publish Immediately</Label>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saving}>
                      {saving ? 'Creating...' : 'Create Event'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
