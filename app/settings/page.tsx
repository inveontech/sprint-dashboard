"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, Plus, Trash2, Archive, Edit2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDashboardStore } from "@/lib/store";
import { PageHeader } from "@/components/layout/PageHeader";

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

export default function SettingsPage() {
  const { setCustomer, sprints } = useDashboardStore();
  const [developers, setDevelopers] = useState<DeveloperTarget[]>([]);
  const [customers, setCustomers] = useState<CustomerTarget[]>([]);
  const [sprintTargets, setSprintTargets] = useState<SprintTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Sprint selection states
  const [selectedSprint, setSelectedSprint] = useState<number | null>(null);
  const [calculatedTarget, setCalculatedTarget] = useState<number>(0);
  const [editingTargetId, setEditingTargetId] = useState<number | null>(null);
  const [editTargetValue, setEditTargetValue] = useState<number>(0);

  // Reset customer filter on page mount
  useEffect(() => {
    setCustomer(null);
  }, []);

  useEffect(() => {
    loadTargets();
    // Load all sprints for settings page (not filtered)
    useDashboardStore.getState().fetchSprints(50);
  }, []);

  const loadTargets = async () => {
    try {
      setLoading(true);
      
      // Load developer targets
      const devResponse = await fetch('/developer-targets.json');
      const devData = await devResponse.json();
      // Handle both formats: { developers: [...] } or direct array
      const devArray = Array.isArray(devData) ? devData : devData.developers || [];
      // Convert "developer" field to "name" and "targetSP" to "target"
      const devMapped = devArray.map((d: any) => ({
        name: d.name || d.developer || '',
        target: d.target || d.targetSP || 0
      }));
      setDevelopers(devMapped);

      // Load customer targets
      const custResponse = await fetch('/customer-targets.json');
      const custData = await custResponse.json();
      // Handle both formats: { customers: [...] } or direct array
      const custArray = Array.isArray(custData) ? custData : custData.customers || [];
      // Map "name" field to "customer" for consistency
      const custMapped = custArray.map((c: any) => ({
        customer: c.customer || c.name || '',
        targetSP: c.targetSP || 0
      }));
      setCustomers(custMapped);
      
      // Calculate total customer target
      const totalTarget = custMapped.reduce((sum: number, c: CustomerTarget) => sum + c.targetSP, 0);
      setCalculatedTarget(totalTarget);

      // Load sprint targets history
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

  const addDeveloper = () => {
    setDevelopers([...developers, { name: '', target: 0 }]);
  };

  const removeDeveloper = (index: number) => {
    setDevelopers(developers.filter((_, i) => i !== index));
  };

  const updateDeveloper = (index: number, field: 'name' | 'target', value: string | number) => {
    const updated = [...developers];
    updated[index] = { ...updated[index], [field]: value };
    setDevelopers(updated);
  };

  const addCustomer = () => {
    setCustomers([...customers, { customer: '', targetSP: 0 }]);
  };

  const removeCustomer = (index: number) => {
    setCustomers(customers.filter((_, i) => i !== index));
  };

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
      if (!sprint) {
        throw new Error('Sprint bulunamadı');
      }

      // Get customer list from sprint metrics
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
        loadTargets(); // Reload to show in list
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
      if (!target) {
        throw new Error('Target bulunamadı');
      }

      const response = await fetch('/api/settings/sprint-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sprintId: target.sprintId,
          sprintName: target.sprintName,
          targetPoints: editTargetValue,
          customers: target.customers,
          savedAt: target.savedAt, // Keep original save date
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
    if (!confirm('Bu sprint hedefini silmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      setSaving(true);
      // Read current targets and remove the one to delete
      const response = await fetch('/sprint-targets.json');
      const targets = await response.json();
      const updatedTargets = targets.filter((t: SprintTarget) => t.sprintId !== sprintId);

      // Save updated list
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

        {/* Developer Targets */}
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Developer Hedefleri (Story Points)</CardTitle>
            <div className="flex gap-2">
              <Button onClick={addDeveloper} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Ekle
              </Button>
              <Button onClick={saveDevelopers} disabled={saving} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Kaydet
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
                    <input
                      type="text"
                      value={dev.name}
                      onChange={(e) => updateDeveloper(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Developer adı"
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type="number"
                      value={dev.target}
                      onChange={(e) => updateDeveloper(index, 'target', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      onClick={() => removeDeveloper(index)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {developers.length === 0 && (
                <p className="text-center text-gray-500 py-4">Henüz developer hedefi yok. "Ekle" butonuna tıklayın.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer Targets */}
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Marka Hedefleri (Story Points)</CardTitle>
            <div className="flex gap-2">
              <Button onClick={addCustomer} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Ekle
              </Button>
              <Button onClick={saveCustomers} disabled={saving} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Kaydet
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
                    <input
                      type="text"
                      value={cust.customer}
                      onChange={(e) => updateCustomer(index, 'customer', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Marka adı"
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type="number"
                      value={cust.targetSP}
                      onChange={(e) => updateCustomer(index, 'targetSP', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      onClick={() => removeCustomer(index)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {customers.length === 0 && (
                <p className="text-center text-gray-500 py-4">Henüz marka hedefi yok. "Ekle" butonuna tıklayın.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sprint Target History */}
        <Card>
          <CardHeader>
            <CardTitle>Sprint Hedef Geçmişi</CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Geçmiş sprintler için hedef kaydedebilirsiniz. Marka hedefleri değiştiğinde, eski sprintler kaydedilen hedefler üzerinden gösterilir.
            </p>
          </CardHeader>
          <CardContent>
            {/* Sprint Target Recorder */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200">
              <h3 className="font-semibold mb-3">Yeni Sprint Hedefi Kaydet</h3>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">Sprint Seçin</label>
                  <select
                    value={selectedSprint || ''}
                    onChange={(e) => setSelectedSprint(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Sprint Seçin --</option>
                    {sprints.map((sprint) => (
                      <option key={sprint.id} value={sprint.id}>
                        {sprint.name} ({sprint.state})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-40">
                  <label className="block text-sm font-medium mb-2">Toplam Hedef SP</label>
                  <input
                    type="number"
                    value={calculatedTarget}
                    onChange={(e) => setCalculatedTarget(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Button onClick={saveSprintTarget} disabled={saving || !selectedSprint}>
                  <Archive className="h-4 w-4 mr-2" />
                  Kaydet
                </Button>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                * Varsayılan olarak marka hedeflerinin toplamıdır, istediğiniz değeri yazabilirsiniz
              </p>
            </div>

            {/* Saved Sprint Targets List */}
            <div className="space-y-2">
              <h3 className="font-semibold mb-3">Kaydedilmiş Sprint Hedefleri</h3>
              {sprintTargets.length === 0 ? (
                <p className="text-center text-gray-500 py-4">Henüz kaydedilmiş sprint hedefi yok.</p>
              ) : (
                <div className="space-y-2">
                  {sprintTargets.map((target) => (
                    <div
                      key={target.sprintId}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border"
                    >
                      {editingTargetId === target.sprintId ? (
                        // Edit mode
                        <>
                          <div className="flex-1">
                            <div className="font-medium mb-2">{target.sprintName}</div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-600">Hedef SP:</label>
                                <input
                                  type="number"
                                  value={editTargetValue}
                                  onChange={(e) => setEditTargetValue(Number(e.target.value) || 0)}
                                  className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div className="text-xs text-gray-500">
                                Kaydedilme: {new Date(target.savedAt).toLocaleDateString('tr-TR')}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => updateSprintTarget(target.sprintId)}
                              size="sm"
                              disabled={saving}
                            >
                              <Save className="h-4 w-4 mr-1" />
                              Kaydet
                            </Button>
                            <Button
                              onClick={cancelEditTarget}
                              size="sm"
                              variant="outline"
                            >
                              İptal
                            </Button>
                          </div>
                        </>
                      ) : (
                        // View mode
                        <>
                          <div>
                            <div className="font-medium">{target.sprintName}</div>
                            <div className="text-sm text-gray-600">
                              Hedef: {target.targetPoints} SP | Kaydedilme: {new Date(target.savedAt).toLocaleDateString('tr-TR')}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-sm text-gray-500">
                              Sprint ID: {target.sprintId}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => startEditTarget(target)}
                                size="sm"
                                variant="ghost"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() => deleteSprintTarget(target.sprintId)}
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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
        </div>
      </main>
    </div>
  );
}
