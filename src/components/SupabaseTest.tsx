'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SupabaseTest() {
  const [status, setStatus] = useState<string>('Testing...');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    testSupabaseConnection();
  }, []);

  const testSupabaseConnection = async () => {
    try {
      setStatus('Testing Supabase connection...');
      
      // Test basic connection
      const { data, error } = await supabase.from('chats').select('count').limit(1);
      
      if (error) {
        console.error('Supabase connection error:', error);
        setError(`Connection failed: ${error.message}`);
        setStatus('Failed');
      } else {
        console.log('Supabase connection successful:', data);
        setStatus('Connected successfully!');
        setError('');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError(`Unexpected error: ${err}`);
      setStatus('Failed');
    }
  };

  const testAuth = async () => {
    try {
      setStatus('Testing auth...');
      
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth test error:', error);
        setError(`Auth failed: ${error.message}`);
        setStatus('Auth Failed');
      } else {
        console.log('Auth test successful:', data);
        setStatus(`Auth OK - Session: ${data.session ? 'Yes' : 'No'}`);
        setError('');
      }
    } catch (err) {
      console.error('Auth test unexpected error:', err);
      setError(`Auth error: ${err}`);
      setStatus('Auth Failed');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Supabase Connection Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium">Status: {status}</p>
          {error && (
            <p className="text-sm text-destructive mt-1">{error}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Button onClick={testSupabaseConnection} className="w-full">
            Test Database Connection
          </Button>
          <Button onClick={testAuth} variant="outline" className="w-full">
            Test Authentication
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing'}</p>
          <p>Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'}</p>
        </div>
      </CardContent>
    </Card>
  );
} 