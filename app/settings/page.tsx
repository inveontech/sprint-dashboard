"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, Plus, Trash2, Archive, Edit2, Users, Target, UserCog, Eye, EyeOff, Shield, RefreshCw, Database } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDashboardStore } from "@/lib/store";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/AuthProvider";
import type { SafeUser, Role, Permission } from "@/types/auth";

interface DeveloperTarget {
  name: string;
  target: number;
}

interface CustomerTarget {
  customer: string;
  targetSP: number;
}

interface SprintTarget {
  sprintId: number;
  sprintName: string;
  targetPoints: number;
  customers: string[];
  savedAt: string;
}

const ROLES: { value: Role; label: string; color: string }[] = [
  { value: 'admin', label: 'Admin', color: 'bg-red-100 text-red-800' },
  { value: 'pm', label: 'PM', color: 'bg-blue-100 text-blue-800' },
  { value: 'developer', label: 'Developer', color: 'bg-green-100 text-green-800' },
  { value: 'viewer', label: 'Viewer', color: 'bg-gray-100 text-gray-800' },
];

const PERMISSION_LABELS: Record<Permission, string> = {
  'sprint:read': 'Sprint Görüntüleme',
  'sprint:write': 'Sprint Düzenleme',
  'settings:read': 'Ayarlar Görüntüleme',
  'settings:write': 'Ayarlar Düzenleme',
  'developers:read': 'Developer Görüntüleme',
  'developers:write': 'Developer Düzenleme',
  'ai:analyze': 'AI Analiz',
  'users:read': 'Kullanıcı Görüntüleme',
  'users:write': 'Kullanıcı Yönetimi',
};

export default function SettingsPage() {
  const { setCustomer, sprints } = useDashboardStore();
  const { user: currentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'targets' | 'users' | 'cache'>('targets');
  
  const [developers, setDevelopers] = useState<DeveloperTarget[]>([]);
  const [customers, setCustomers] = useState<CustomerTarget[]>([]);
  const [sprintTargets, setSprintTargets] = useState<SprintTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [selectedSprint, setSelectedSprint] = useState<number | null>(null);
  const [calculatedTarget, setCalculatedTarget] = useState<number>(0);
  const [editingTargetId, setEditingTargetId] = useState<number | null>(null);
  const [editTargetValue, setEditTargetValue] = useState<number>(0);
  
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<SafeUser | null>(null);
  const [userForm, setUserForm] = useState({
    email: '',
    name: '',
    password: '',
    role: 'viewer' as Role,
    isActive: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [cacheClearing, setCacheClearing] = useState(false);
  const [cacheStats, setCacheStats] = useState<any>(null);

  // Get current user role from AuthProvider
  const currentUserRole = currentUser?.role || null;

  // Helper to get auth headers for API calls
  const getAuthHeaders = (): HeadersInit => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  useEffect(() => {
    setCustomer(null);
  }, []);

  useEffect(() => {
    loadTargets();
    useDashboardStore.getState().fetchSprints(50);
  }, []);
  
  useEffect(() => {
    if (activeTab === 'users' && currentUserRole === 'admin') {
      loadUsers();
    }
    if (activeTab === 'cache' && currentUserRole === 'admin') {
      loadCacheStats();
    }
  }, [activeTab, currentUserRole]);

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await fetch('/api/auth/users', {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        setMessage({ type: 'error', text: 'Kullanıcılar yüklenemedi' });
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      setMessage({ type: 'error', text: 'Kullanıcılar yüklenemedi' });
    } finally {
      setUsersLoading(false);
    }
  };

  const loadCacheStats = async () => {
    try {
      const response = await fetch('/api/cache/clear');
      if (response.ok) {
        const data = await response.json();
        setCacheStats(data);
      }
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    }
  };

  const handleClearCache = async () => {
    if (!confirm('Tüm cache verilerini silmek istediğinize emin misiniz? Kullanıcıların yeniden giriş yapması gerekebilir.')) {
      return;
    }
    try {
      setCacheClearing(true);
      const response = await fetch('/api/cache/clear', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        setMessage({ 
          type: 'success', 
          text: `Cache temizlendi! ${data.deletedKeys} key silindi.` 
        });
        setCacheStats(null);
        loadCacheStats();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Cache temizlenemedi');
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Cache temizlenemedi' });
    } finally {
      setCacheClearing(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const loadTargets = async () => {
    try {
      setLoading(true);
      
      const devResponse = await fetch('/developer-targets.json');
      const devData = await devResponse.json();
      const devArray = Array.isArray(devData) ? devData : devData.developers || [];
      const devMapped = devArray.map((d: any) => ({
        name: d.name || d.developer || '',
        target: d.target || d.targetSP || 0
      }));
      setDevelopers(devMapped);

      const custResponse = await fetch('/customer-targets.json');
      const custData = await custResponse.json();
      const custArray = Array.isArray(custData) ? custData : custData.customers || [];
      const custMapped = custArray.map((c: any) => ({
        customer: c.customer || c.name || '',
        targetSP: c.targetSP || 0
      }));
      setCustomers(custMapped);
      
      const totalTarget = custMapped.reduce((sum: number, c: CustomerTarget) => sum + c.targetSP, 0);
      setCalculatedTarget(totalTarget);

      const sprintTargetResponse = await fetch('/sprint-targets.json');
      const sprintTargetData = await sprintTargetResponse.json();
      setSprintTargets(Array.isArray(sprintTargetData) ? sprintTargetData : []);

      setLoading(false);
    } catch (error) {
      console.error('Failed to load targets:', error);
      setMessage({ type: 'error', text: 'Hedefler yüklenemedi' });
      setLoading(false);
    }
  };

  const saveDevelopers = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/settings/developer-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(developers),
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Developer hedefleri kaydedildi!' });
      } else {
        throw new Error('Kaydetme başarısız');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Developer hedefleri kaydedilemedi' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const saveCustomers = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/settings/customer-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customers),
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Marka hedefleri kaydedildi!' });
      } else {
        throw new Error('Kaydetme başarısız');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Marka hedefleri kaydedilemedi' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const addDeveloper = () => setDevelopers([...developers, { name: '', target: 0 }]);
  const removeDeveloper = (index: number) => setDevelopers(developers.filter((_, i) => i !== index));
  const updateDeveloper = (index: number, field: 'name' | 'target', value: string | number) => {
    const updated = [...developers];
    updated[index] = { ...updated[index], [field]: value };
    setDevelopers(updated);
  };

  const addCustomer = () => setCustomers([...customers, { customer: '', targetSP: 0 }]);
  const removeCustomer = (index: number) => setCustomers(customers.filter((_, i) => i !== index));
  const updateCustomer = (index: number, field: 'customer' | 'targetSP', value: string | number) => {
    const updated = [...customers];
    updated[index] = { ...updated[index], [field]: value };
    setCustomers(updated);
  };

  const saveSprintTarget = async () => {
    if (!selectedSprint) {
      setMessage({ type: 'error', text: 'Lütfen bir sprint seçin' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    try {
      setSaving(true);
      const sprint = sprints.find(s => s.id === selectedSprint);
      if (!sprint) throw new Error('Sprint bulunamadı');

      const sprintDetails = await fetch(`/api/jira/sprint/${selectedSprint}`).then(r => r.json());
      const customerList = sprintDetails.metrics?.customers || [];

      const response = await fetch('/api/settings/sprint-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sprintId: selectedSprint,
          sprintName: sprint.name,
          targetPoints: calculatedTarget,
          customers: customerList,
          savedAt: new Date().toISOString(),
        }),
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Sprint hedefi kaydedildi!' });
        loadTargets();
        setSelectedSprint(null);
      } else {
        throw new Error('Kaydetme başarısız');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Sprint hedefi kaydedilemedi' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const startEditTarget = (target: SprintTarget) => {
    setEditingTargetId(target.sprintId);
    setEditTargetValue(target.targetPoints);
  };

  const cancelEditTarget = () => {
    setEditingTargetId(null);
    setEditTargetValue(0);
  };

  const updateSprintTarget = async (sprintId: number) => {
    try {
      setSaving(true);
      const target = sprintTargets.find(t => t.sprintId === sprintId);
      if (!target) throw new Error('Target bulunamadı');

      const response = await fetch('/api/settings/sprint-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sprintId: target.sprintId,
          sprintName: target.sprintName,
          targetPoints: editTargetValue,
          customers: target.customers,
          savedAt: target.savedAt,
        }),
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Sprint hedefi güncellendi!' });
        loadTargets();
        setEditingTargetId(null);
      } else {
        throw new Error('Güncelleme başarısız');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Sprint hedefi güncellenemedi' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const deleteSprintTarget = async (sprintId: number) => {
    if (!confirm('Bu sprint hedefini silmek istediğinize emin misiniz?')) return;
    try {
      setSaving(true);
      const response = await fetch('/sprint-targets.json');
      const targets = await response.json();
      const updatedTargets = targets.filter((t: SprintTarget) => t.sprintId !== sprintId);
      const saveResponse = await fetch('/api/settings/sprint-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets: updatedTargets, deleteMode: true }),
      });
      if (saveResponse.ok) {
        setMessage({ type: 'success', text: 'Sprint hedefi silindi!' });
        loadTargets();
      } else {
        throw new Error('Silme başarısız');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Sprint hedefi silinemedi' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const resetUserForm = () => {
    setUserForm({ email: '', name: '', password: '', role: 'viewer', isActive: true });
    setEditingUser(null);
    setShowUserForm(false);
    setShowPassword(false);
  };

  const handleEditUser = (user: SafeUser) => {
    setEditingUser(user);
    setUserForm({
      email: user.email,
      name: user.name || '',
      password: '',
      role: user.role,
      isActive: user.isActive,
    });
    setShowUserForm(true);
  };

  const handleSaveUser = async () => {
    if (!userForm.email) {
      setMessage({ type: 'error', text: 'Email gerekli' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    if (!editingUser && !userForm.password) {
      setMessage({ type: 'error', text: 'Yeni kullanıcı için şifre gerekli' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    try {
      setSaving(true);
      if (editingUser) {
        const response = await fetch(`/api/auth/users/${editingUser.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            email: userForm.email,
            name: userForm.name || undefined,
            password: userForm.password || undefined,
            role: userForm.role,
            isActive: userForm.isActive,
          }),
        });
        if (response.ok) {
          setMessage({ type: 'success', text: 'Kullanıcı güncellendi!' });
          loadUsers();
          resetUserForm();
        } else {
          const data = await response.json();
          throw new Error(data.error || 'Güncelleme başarısız');
        }
      } else {
        const response = await fetch('/api/auth/users', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            email: userForm.email,
            name: userForm.name || undefined,
            password: userForm.password,
            role: userForm.role,
          }),
        });
        if (response.ok) {
          setMessage({ type: 'success', text: 'Kullanıcı oluşturuldu!' });
          loadUsers();
          resetUserForm();
        } else {
          const data = await response.json();
          throw new Error(data.error || 'Oluşturma başarısız');
        }
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'İşlem başarısız' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`"${userEmail}" kullanıcısını silmek istediğinize emin misiniz?`)) return;
    try {
      setSaving(true);
      const response = await fetch(`/api/auth/users/${userId}`, { 
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Kullanıcı silindi!' });
        loadUsers();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Silme başarısız');
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Silme başarısız' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const toggleUserActive = async (user: SafeUser) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/auth/users/${user.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (response.ok) {
        setMessage({ type: 'success', text: `Kullanıcı ${!user.isActive ? 'aktif edildi' : 'deaktif edildi'}!` });
        loadUsers();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'İşlem başarısız');
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'İşlem başarısız' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 border-b">
          <div className="px-6 py-8">
            <PageHeader title="Settings" description="Dashboard tercihlerini, hedeflerini ve bildirim ayarlarını yapılandırın" />
          </div>
        </header>
        <main className="px-6 py-8">
          <p>Yükleniyor...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="px-6 py-8">
          <PageHeader title="Settings" description="Dashboard tercihlerini, hedeflerini ve bildirim ayarlarını yapılandırın" />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-8">
        <div className="max-w-7xl mx-auto">        {message && (
          <Alert className={`mb-6 ${message.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('targets')}
            className={`flex items-center gap-2 px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'targets'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Target className="h-4 w-4" />
            Hedef Yönetimi
          </button>
          {currentUserRole === 'admin' && (
            <>
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-2 px-4 py-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Users className="h-4 w-4" />
                Kullanıcı Yönetimi
              </button>
              <button
                onClick={() => setActiveTab('cache')}
                className={`flex items-center gap-2 px-4 py-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'cache'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Database className="h-4 w-4" />
                Cache Yönetimi
              </button>
            </>
          )}
        </div>

        {/* Targets Tab */}
        {activeTab === 'targets' && (
          <>
            <Card className="mb-8">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Developer Hedefleri (Story Points)</CardTitle>
                <div className="flex gap-2">
                  <Button onClick={addDeveloper} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />Ekle
                  </Button>
                  <Button onClick={saveDevelopers} disabled={saving} size="sm">
                    <Save className="h-4 w-4 mr-2" />Kaydet
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-4 font-semibold text-sm text-gray-600 pb-2 border-b">
                    <div className="col-span-7">Developer Adı</div>
                    <div className="col-span-4">Hedef SP</div>
                    <div className="col-span-1"></div>
                  </div>
                  {developers.map((dev, index) => (
                    <div key={index} className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-7">
                        <input type="text" value={dev.name} onChange={(e) => updateDeveloper(index, 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Developer adı" />
                      </div>
                      <div className="col-span-4">
                        <input type="number" value={dev.target} onChange={(e) => updateDeveloper(index, 'target', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" min="0" />
                      </div>
                      <div className="col-span-1">
                        <Button onClick={() => removeDeveloper(index)} variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {developers.length === 0 && <p className="text-center text-gray-500 py-4">Henüz developer hedefi yok.</p>}
                </div>
              </CardContent>
            </Card>

            <Card className="mb-8">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Marka Hedefleri (Story Points)</CardTitle>
                <div className="flex gap-2">
                  <Button onClick={addCustomer} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />Ekle
                  </Button>
                  <Button onClick={saveCustomers} disabled={saving} size="sm">
                    <Save className="h-4 w-4 mr-2" />Kaydet
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-4 font-semibold text-sm text-gray-600 pb-2 border-b">
                    <div className="col-span-7">Marka Adı</div>
                    <div className="col-span-4">Hedef SP</div>
                    <div className="col-span-1"></div>
                  </div>
                  {customers.map((cust, index) => (
                    <div key={index} className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-7">
                        <input type="text" value={cust.customer} onChange={(e) => updateCustomer(index, 'customer', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Marka adı" />
                      </div>
                      <div className="col-span-4">
                        <input type="number" value={cust.targetSP} onChange={(e) => updateCustomer(index, 'targetSP', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" min="0" />
                      </div>
                      <div className="col-span-1">
                        <Button onClick={() => removeCustomer(index)} variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {customers.length === 0 && <p className="text-center text-gray-500 py-4">Henüz marka hedefi yok.</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sprint Hedef Geçmişi</CardTitle>
                <p className="text-sm text-gray-600 mt-2">Geçmiş sprintler için hedef kaydedebilirsiniz.</p>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200">
                  <h3 className="font-semibold mb-3">Yeni Sprint Hedefi Kaydet</h3>
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-2">Sprint Seçin</label>
                      <select value={selectedSprint || ''} onChange={(e) => setSelectedSprint(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">-- Sprint Seçin --</option>
                        {sprints.map((sprint) => (
                          <option key={sprint.id} value={sprint.id}>{sprint.name} ({sprint.state})</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-40">
                      <label className="block text-sm font-medium mb-2">Toplam Hedef SP</label>
                      <input type="number" value={calculatedTarget} onChange={(e) => setCalculatedTarget(Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <Button onClick={saveSprintTarget} disabled={saving || !selectedSprint}>
                      <Archive className="h-4 w-4 mr-2" />Kaydet
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold mb-3">Kaydedilmiş Sprint Hedefleri</h3>
                  {sprintTargets.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">Henüz kaydedilmiş sprint hedefi yok.</p>
                  ) : (
                    <div className="space-y-2">
                      {sprintTargets.map((target) => (
                        <div key={target.sprintId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                          {editingTargetId === target.sprintId ? (
                            <>
                              <div className="flex-1">
                                <div className="font-medium mb-2">{target.sprintName}</div>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2">
                                    <label className="text-sm text-gray-600">Hedef SP:</label>
                                    <input type="number" value={editTargetValue} onChange={(e) => setEditTargetValue(Number(e.target.value) || 0)}
                                      className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button onClick={() => updateSprintTarget(target.sprintId)} size="sm" disabled={saving}>
                                  <Save className="h-4 w-4 mr-1" />Kaydet
                                </Button>
                                <Button onClick={cancelEditTarget} size="sm" variant="outline">İptal</Button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <div className="font-medium">{target.sprintName}</div>
                                <div className="text-sm text-gray-600">Hedef: {target.targetPoints} SP</div>
                              </div>
                              <div className="flex gap-2">
                                <Button onClick={() => startEditTarget(target)} size="sm" variant="ghost" className="text-blue-600">
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button onClick={() => deleteSprintTarget(target.sprintId)} size="sm" variant="ghost" className="text-red-600">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && currentUserRole === 'admin' && (
          <>
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="h-5 w-5" />Kullanıcı Yönetimi
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Kullanıcı rolleri ve erişim yetkilerini yönetin. Yeni kullanıcılar <a href="/signup" className="text-blue-500 hover:underline">/signup</a> sayfasından kayıt olabilir.
                </p>
              </CardHeader>
              <CardContent>
                {showUserForm && (
                  <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Shield className="h-4 w-4" />Kullanıcı Düzenle
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Email *</label>
                        <input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="kullanici@inveon.com" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Ad Soyad</label>
                        <input type="text" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ad Soyad" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Şifre {editingUser ? '(Boş bırakılırsa değişmez)' : '*'}</label>
                        <div className="relative">
                          <input type={showPassword ? 'text' : 'password'} value={userForm.password}
                            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Rol</label>
                        <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value as Role })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                          {ROLES.map((role) => (<option key={role.value} value={role.value}>{role.label}</option>))}
                        </select>
                      </div>
                      {editingUser && (
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id="isActive" checked={userForm.isActive}
                            onChange={(e) => setUserForm({ ...userForm, isActive: e.target.checked })} className="h-4 w-4 rounded border-gray-300" />
                          <label htmlFor="isActive" className="text-sm font-medium">Aktif</label>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button onClick={handleSaveUser} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />{editingUser ? 'Güncelle' : 'Oluştur'}
                      </Button>
                      <Button onClick={resetUserForm} variant="outline">İptal</Button>
                    </div>
                  </div>
                )}

                {usersLoading ? (
                  <p className="text-center py-4">Kullanıcılar yükleniyor...</p>
                ) : users.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">Henüz kullanıcı yok.</p>
                ) : (
                  <div className="space-y-2">
                    {users.map((user) => {
                      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@inveon.com';
                      const isProtectedAdmin = user.email === adminEmail;
                      
                      return (
                        <div key={user.id} className={`flex items-center justify-between p-4 rounded-lg border ${user.isActive ? 'bg-white dark:bg-gray-800' : 'bg-gray-100 dark:bg-gray-900 opacity-60'} ${isProtectedAdmin ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' : ''}`}>
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="font-medium">{user.name || user.email}</div>
                              <Badge className={ROLES.find(r => r.value === user.role)?.color || ''}>
                                {ROLES.find(r => r.value === user.role)?.label || user.role}
                              </Badge>
                              {isProtectedAdmin && <Badge className="bg-amber-100 text-amber-800 border-amber-300">Korumalı</Badge>}
                              {!user.isActive && <Badge variant="outline" className="text-red-600 border-red-300">Deaktif</Badge>}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {user.email}
                              {user.lastLoginAt && <span className="ml-4">Son giriş: {new Date(user.lastLoginAt).toLocaleDateString('tr-TR')}</span>}
                            </div>
                            {isProtectedAdmin && (
                              <p className="text-xs text-amber-600 mt-1">
                                ⚠️ Admin hesabı sistem tarafından korunmaktadır. Değişiklikler sadece environment variables üzerinden yapılabilir.
                              </p>
                            )}
                          </div>
                          {!isProtectedAdmin && (
                            <div className="flex items-center gap-2">
                              <Button onClick={() => toggleUserActive(user)} size="sm" variant="ghost" className="text-gray-600" title={user.isActive ? 'Deaktif Et' : 'Aktif Et'}>
                                {user.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              <Button onClick={() => handleEditUser(user)} size="sm" variant="ghost" className="text-blue-600">
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button onClick={() => handleDeleteUser(user.id, user.email)} size="sm" variant="ghost" className="text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Rol ve Yetki Tablosu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Yetki</th>
                        <th className="text-center py-2 px-3">Admin</th>
                        <th className="text-center py-2 px-3">PM</th>
                        <th className="text-center py-2 px-3">Developer</th>
                        <th className="text-center py-2 px-3">Viewer</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b"><td className="py-2 px-3">Sprint Görüntüleme</td><td className="text-center">✅</td><td className="text-center">✅</td><td className="text-center">✅</td><td className="text-center">✅</td></tr>
                      <tr className="border-b"><td className="py-2 px-3">Sprint Düzenleme</td><td className="text-center">✅</td><td className="text-center">✅</td><td className="text-center">❌</td><td className="text-center">❌</td></tr>
                      <tr className="border-b"><td className="py-2 px-3">Ayarlar</td><td className="text-center">✅</td><td className="text-center">✅</td><td className="text-center">❌</td><td className="text-center">❌</td></tr>
                      <tr className="border-b"><td className="py-2 px-3">Developer Performans</td><td className="text-center">✅</td><td className="text-center">✅</td><td className="text-center">Sadece kendi</td><td className="text-center">❌</td></tr>
                      <tr className="border-b"><td className="py-2 px-3">AI Analiz</td><td className="text-center">✅</td><td className="text-center">✅</td><td className="text-center">❌</td><td className="text-center">❌</td></tr>
                      <tr className="border-b"><td className="py-2 px-3">Kullanıcı Yönetimi</td><td className="text-center">✅</td><td className="text-center">❌</td><td className="text-center">❌</td><td className="text-center">❌</td></tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Cache Tab - Admin Only */}
        {activeTab === 'cache' && currentUserRole === 'admin' && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Redis Cache Yönetimi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ Cache temizleme işlemi, tüm oturum bilgilerini ve geçici verileri siler. 
                    Kullanıcıların yeniden giriş yapması gerekebilir.
                  </p>
                </div>

                {/* Cache Stats */}
                {cacheStats && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg dark:bg-blue-900/20">
                      <div className="text-2xl font-bold text-blue-600">{cacheStats.totalKeys || 0}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Toplam Cache Key</div>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg dark:bg-purple-900/20">
                      <div className="text-2xl font-bold text-purple-600">{cacheStats.sessionKeys || 0}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Aktif Oturum</div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg dark:bg-green-900/20">
                      <div className="text-2xl font-bold text-green-600">{cacheStats.userKeys || 0}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Kullanıcı Verisi</div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <Button 
                    onClick={loadCacheStats}
                    variant="outline"
                    disabled={cacheClearing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${cacheClearing ? 'animate-spin' : ''}`} />
                    İstatistikleri Yenile
                  </Button>
                  <Button 
                    onClick={handleClearCache}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    disabled={cacheClearing}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {cacheClearing ? 'Temizleniyor...' : 'Tüm Cache\'i Temizle'}
                  </Button>
                </div>

                {/* Key Breakdown */}
                {cacheStats?.breakdown && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Cache Key Dağılımı</h4>
                    <div className="space-y-2">
                      {Object.entries(cacheStats.breakdown as Record<string, number>).map(([key, count]) => (
                        <div key={key} className="flex justify-between items-center p-2 bg-gray-50 rounded dark:bg-gray-800">
                          <code className="text-sm">{key}</code>
                          <Badge variant="secondary">{count as number}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        </div>
      </main>
    </div>
  );
}
