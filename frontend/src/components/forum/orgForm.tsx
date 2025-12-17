import React, { useState } from 'react';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';

interface OrgFormProps {
  initialData?: {
    name?: string;
    description?: string;
  };
  onSubmit: (data: { name: string; description?: string }) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

const OrgForm: React.FC<OrgFormProps> = ({
  initialData,
  onSubmit,
  isSubmitting,
  submitLabel = 'Submit',
}) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Organization name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="Organization Name"
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        error={errors.name}
        disabled={isSubmitting}
        required
      />
      
      <div>
        <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
          Description (optional)
        </label>
        <textarea
          className="textarea"
          rows={4}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          disabled={isSubmitting}
          placeholder="Describe your organization..."
        />
      </div>
      
      <Button 
        type="submit" 
        variant="primary" 
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Submitting...' : submitLabel}
      </Button>
    </form>
  );
};

export default OrgForm;

