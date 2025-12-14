import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Inbox, Send, Calendar, Eye, Reply, Plus, MessageSquare } from 'lucide-react';
import { useMessages, InboxMessage, OutboxMessage } from '@/hooks/admin/useMessages';
import { SkeletonCard, SkeletonTable } from '@/components/ui/skeleton-card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

const Messages = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInboxMessage, setSelectedInboxMessage] = useState<InboxMessage | null>(null);
  const [selectedOutboxMessage, setSelectedOutboxMessage] = useState<OutboxMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [newMessageUserId, setNewMessageUserId] = useState('');
  const [newMessageText, setNewMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const { inboxMessages, outboxMessages, isLoading, unreadInboxCount, pendingReplyCount } = useMessages();
  const { toast } = useToast();

  // Fetch users for new message dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['users-for-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .order('first_name');
      if (error) throw error;
      return data || [];
    },
  });

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('contact_messages')
        .update({ is_read: true })
        .eq('id', messageId);

      if (error) throw error;
      toast({ title: "Success", description: "Message marked as read" });
    } catch (error) {
      console.error('Error marking message as read:', error);
      toast({ title: "Error", description: "Failed to mark message as read", variant: "destructive" });
    }
  };

  const sendReply = async (contactMessage: InboxMessage) => {
    if (!replyText.trim()) return;
    setIsReplying(true);

    try {
      // First, find the user_id from the contact message email
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', contactMessage.email)
        .single();

      if (!profile) {
        toast({ title: "Error", description: "User not found for this email", variant: "destructive" });
        return;
      }

      // Insert reply into messages table
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          user_id: profile.user_id,
          message: replyText,
          reply_to_contact_id: contactMessage.id,
          is_read: false,
        });

      if (insertError) throw insertError;

      // Update contact message with replied_at timestamp
      const { error: updateError } = await supabase
        .from('contact_messages')
        .update({ replied_at: new Date().toISOString(), is_read: true })
        .eq('id', contactMessage.id);

      if (updateError) throw updateError;

      toast({ title: "Success", description: "Reply sent successfully" });
      setReplyText('');
      setSelectedInboxMessage(null);
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({ title: "Error", description: "Failed to send reply", variant: "destructive" });
    } finally {
      setIsReplying(false);
    }
  };

  const sendNewMessage = async () => {
    if (!newMessageUserId || !newMessageText.trim()) return;
    setIsSending(true);

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          user_id: newMessageUserId,
          message: newMessageText,
          is_read: false,
        });

      if (error) throw error;

      toast({ title: "Success", description: "Message sent successfully" });
      setNewMessageText('');
      setNewMessageUserId('');
      setNewMessageOpen(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const getOutboxUserName = (message: OutboxMessage) => {
    if (message.profiles?.first_name && message.profiles?.last_name) {
      return `${message.profiles.first_name} ${message.profiles.last_name}`;
    }
    return message.profiles?.email || `User ${message.user_id.substring(0, 8)}`;
  };

  const filteredInbox = inboxMessages.filter(msg => {
    const search = searchTerm.toLowerCase();
    return (
      msg.first_name.toLowerCase().includes(search) ||
      msg.last_name.toLowerCase().includes(search) ||
      msg.email.toLowerCase().includes(search) ||
      msg.subject.toLowerCase().includes(search) ||
      msg.message.toLowerCase().includes(search)
    );
  });

  const filteredOutbox = outboxMessages.filter(msg => {
    const search = searchTerm.toLowerCase();
    return (
      msg.message.toLowerCase().includes(search) ||
      getOutboxUserName(msg).toLowerCase().includes(search)
    );
  });

  const todayInboxCount = inboxMessages.filter(m => 
    new Date(m.created_at).toDateString() === new Date().toDateString()
  ).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">Manage inbox and sent messages</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonTable />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">Manage inbox and sent messages</p>
        </div>
        <Dialog open={newMessageOpen} onOpenChange={setNewMessageOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Message
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send New Message</DialogTitle>
              <DialogDescription>Send a message to a user</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Select User</label>
                <Select value={newMessageUserId} onValueChange={setNewMessageUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.first_name} {user.last_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder="Type your message..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewMessageOpen(false)}>Cancel</Button>
              <Button onClick={sendNewMessage} disabled={isSending || !newMessageUserId || !newMessageText.trim()}>
                {isSending ? "Sending..." : "Send Message"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inbox</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inboxMessages.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <MessageSquare className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{unreadInboxCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reply</CardTitle>
            <Reply className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{pendingReplyCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{outboxMessages.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inbox" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="inbox" className="flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              Inbox
              {unreadInboxCount > 0 && (
                <Badge variant="destructive" className="ml-1">{unreadInboxCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Sent Messages
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </div>

        <TabsContent value="inbox">
          <Card>
            <CardHeader>
              <CardTitle>Inbox Messages</CardTitle>
              <CardDescription>Messages received from users</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInbox.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">No messages found</TableCell>
                    </TableRow>
                  ) : (
                    filteredInbox.map((msg) => (
                      <TableRow key={msg.id}>
                        <TableCell className="text-sm">
                          {new Date(msg.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{msg.first_name} {msg.last_name}</div>
                            <div className="text-sm text-muted-foreground">{msg.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="truncate">{msg.subject}</p>
                        </TableCell>
                        <TableCell>
                          {msg.replied_at ? (
                            <Badge variant="secondary">Replied</Badge>
                          ) : msg.is_read ? (
                            <Badge variant="outline">Read</Badge>
                          ) : (
                            <Badge variant="default">Unread</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedInboxMessage(msg);
                                    if (!msg.is_read) markAsRead(msg.id);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Message from {msg.first_name} {msg.last_name}</DialogTitle>
                                  <DialogDescription>{msg.email}</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-sm font-medium">Subject</label>
                                    <p className="text-muted-foreground">{msg.subject}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Message</label>
                                    <div className="mt-2 p-4 bg-muted rounded-lg">
                                      <p className="whitespace-pre-wrap">{msg.message}</p>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <label className="font-medium">Received</label>
                                      <p className="text-muted-foreground">{new Date(msg.created_at).toLocaleString()}</p>
                                    </div>
                                    <div>
                                      <label className="font-medium">Status</label>
                                      <p>{msg.replied_at ? 'Replied' : msg.is_read ? 'Read' : 'Unread'}</p>
                                    </div>
                                  </div>
                                  {!msg.replied_at && (
                                    <div>
                                      <label className="text-sm font-medium">Your Reply</label>
                                      <Textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="Type your reply..."
                                        rows={4}
                                        className="mt-2"
                                      />
                                    </div>
                                  )}
                                </div>
                                {!msg.replied_at && (
                                  <DialogFooter>
                                    <Button 
                                      onClick={() => sendReply(msg)} 
                                      disabled={isReplying || !replyText.trim()}
                                    >
                                      <Reply className="h-4 w-4 mr-2" />
                                      {isReplying ? "Sending..." : "Send Reply"}
                                    </Button>
                                  </DialogFooter>
                                )}
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sent">
          <Card>
            <CardHeader>
              <CardTitle>Sent Messages</CardTitle>
              <CardDescription>Messages sent to users</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOutbox.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">No messages found</TableCell>
                    </TableRow>
                  ) : (
                    filteredOutbox.map((msg) => (
                      <TableRow key={msg.id}>
                        <TableCell className="text-sm">
                          {new Date(msg.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{getOutboxUserName(msg)}</div>
                            <div className="text-sm text-muted-foreground">{msg.profiles?.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="truncate">{msg.message}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={msg.reply_to_contact_id ? "secondary" : "outline"}>
                            {msg.reply_to_contact_id ? "Reply" : "New"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedOutboxMessage(msg)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Sent Message</DialogTitle>
                                <DialogDescription>To: {getOutboxUserName(msg)}</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Message</label>
                                  <div className="mt-2 p-4 bg-muted rounded-lg">
                                    <p className="whitespace-pre-wrap">{msg.message}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <label className="font-medium">Sent At</label>
                                    <p className="text-muted-foreground">{new Date(msg.created_at).toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <label className="font-medium">Type</label>
                                    <p>{msg.reply_to_contact_id ? 'Reply to inquiry' : 'New message'}</p>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Messages;
