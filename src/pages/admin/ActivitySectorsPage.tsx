import React, { useEffect, useState } from 'react';
import { useActivitySectorStore, ActivitySector } from '../../stores/activitySectorStore';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Plus, CreditCard as Edit2, Trash2, Save, X, Briefcase, AlertTriangle, ArrowUp, ArrowDown, Check } from 'lucide-react';

const ActivitySectorsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { sectors, isLoading, fetchSectors, addSector, updateSector, deleteSector } = useActivitySectorStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
    displayOrder: 0
  });

  useEffect(() => {
    fetchSectors();
  }, []);

  const handleEdit = (sector: ActivitySector) => {
    setEditingId(sector.id);
    setFormData({
      name: sector.name,
      description: sector.description || '',
      isActive: sector.isActive,
      displayOrder: sector.displayOrder
    });
    setIsAdding(false);
  };

  const handleAdd = () => {
    const maxOrder = sectors.length > 0 ? Math.max(...sectors.map(s => s.displayOrder)) : 0;
    setFormData({
      name: '',
      description: '',
      isActive: true,
      displayOrder: maxOrder + 1
    });
    setIsAdding(true);
    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ name: '', description: '', isActive: true, displayOrder: 0 });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Le nom du secteur est requis');
      return;
    }

    try {
      if (isAdding) {
        await addSector(formData);
      } else if (editingId) {
        await updateSector(editingId, formData);
      }
      handleCancel();
    } catch (error) {
      console.error('Error saving sector:', error);
      alert('Erreur lors de l\'enregistrement');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce secteur d\'activite?')) {
      return;
    }

    try {
      await deleteSector(id);
    } catch (error) {
      console.error('Error deleting sector:', error);
      alert('Erreur lors de la suppression. Ce secteur est peut-etre utilise par des projets.');
    }
  };

  const handleMoveUp = async (sector: ActivitySector) => {
    const index = sectors.findIndex(s => s.id === sector.id);
    if (index <= 0) return;

    const prevSector = sectors[index - 1];
    await updateSector(sector.id, { displayOrder: prevSector.displayOrder });
    await updateSector(prevSector.id, { displayOrder: sector.displayOrder });
    await fetchSectors();
  };

  const handleMoveDown = async (sector: ActivitySector) => {
    const index = sectors.findIndex(s => s.id === sector.id);
    if (index >= sectors.length - 1) return;

    const nextSector = sectors[index + 1];
    await updateSector(sector.id, { displayOrder: nextSector.displayOrder });
    await updateSector(nextSector.id, { displayOrder: sector.displayOrder });
    await fetchSectors();
  };

  const handleToggleActive = async (sector: ActivitySector) => {
    await updateSector(sector.id, { isActive: !sector.isActive });
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Acces Restreint
              </h3>
              <p className="text-gray-600">
                Seuls les administrateurs peuvent acceder a cette page.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Secteurs d'Activite</h1>
          <p className="mt-2 text-gray-600">
            Gerez les secteurs d'activite disponibles pour les projets
          </p>
        </div>
        <Button onClick={handleAdd} disabled={isAdding}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un secteur
        </Button>
      </div>

      {isAdding && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-700">
              <Briefcase className="h-5 w-5 mr-2" />
              Nouveau Secteur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Agriculture"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ordre d'affichage
                </label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Description optionnelle du secteur"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                  Secteur actif
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Briefcase className="h-5 w-5 mr-2 text-gray-500" />
            Liste des Secteurs ({sectors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sectors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucun secteur d'activite configure
            </div>
          ) : (
            <div className="space-y-2">
              {sectors.map((sector, index) => (
                <div
                  key={sector.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    editingId === sector.id
                      ? 'border-blue-300 bg-blue-50'
                      : sector.isActive
                      ? 'border-gray-200 bg-white hover:bg-gray-50'
                      : 'border-gray-200 bg-gray-100 opacity-60'
                  }`}
                >
                  {editingId === sector.id ? (
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 mr-4">
                      <div>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Nom"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Description"
                        />
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Actif</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 font-mono w-6">
                          #{sector.displayOrder}
                        </span>
                        <div>
                          <h4 className="font-medium text-gray-900">{sector.name}</h4>
                          {sector.description && (
                            <p className="text-sm text-gray-500">{sector.description}</p>
                          )}
                        </div>
                        {!sector.isActive && (
                          <span className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded">
                            Inactif
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    {editingId === sector.id ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSave}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancel}
                          className="text-gray-600 hover:text-gray-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveUp(sector)}
                          disabled={index === 0}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveDown(sector)}
                          disabled={index === sectors.length - 1}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(sector)}
                          className={sector.isActive ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-gray-600'}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(sector)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(sector.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivitySectorsPage;
