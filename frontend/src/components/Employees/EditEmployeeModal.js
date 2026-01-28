import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { employeeAPI } from '../../services/api';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Button from '../UI/Button';
import { toast } from 'react-toastify';

const EditEmployeeModal = ({ isOpen, onClose, employeeId }) => {
  const queryClient = useQueryClient();

  // Fetch employee details when modal opens
  const { data: employeeData, isLoading } = useQuery(
    ['employee', employeeId],
    () => employeeAPI.getById(employeeId).then(res => res.data),
    { enabled: isOpen && !!employeeId }
  );

  const [formData, setFormData] = useState(null);

  useEffect(() => {
    if (employeeData) {
      setFormData({
        email: employeeData.user?.email || '',
        role: employeeData.user?.role || 'employee',
        personalInfo: {
          firstName: employeeData.personalInfo?.firstName || '',
          lastName: employeeData.personalInfo?.lastName || '',
          dateOfBirth: employeeData.personalInfo?.dateOfBirth || '',
          gender: employeeData.personalInfo?.gender || '',
          maritalStatus: employeeData.personalInfo?.maritalStatus || '',
          nationality: employeeData.personalInfo?.nationality || '',
          address: {
            street: employeeData.personalInfo?.address?.street || '',
            city: employeeData.personalInfo?.address?.city || '',
            state: employeeData.personalInfo?.address?.state || '',
            country: employeeData.personalInfo?.address?.country || '',
            zipCode: employeeData.personalInfo?.address?.zipCode || ''
          },
          phone: employeeData.personalInfo?.phone || '',
          emergencyContact: {
            name: employeeData.personalInfo?.emergencyContact?.name || '',
            relationship: employeeData.personalInfo?.emergencyContact?.relationship || '',
            phone: employeeData.personalInfo?.emergencyContact?.phone || ''
          }
        },
        employmentInfo: {
          position: employeeData.employmentInfo?.position || '',
          department: employeeData.employmentInfo?.department || '',
          joiningDate: employeeData.employmentInfo?.joiningDate
            ? new Date(employeeData.employmentInfo.joiningDate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
          employmentType: employeeData.employmentInfo?.employmentType || 'full-time',
          workLocation: employeeData.employmentInfo?.workLocation || '',
          status: employeeData.employmentInfo?.status || 'active'
        },
        compensation: {
          baseSalary: employeeData.compensation?.baseSalary || '',
          currency: employeeData.compensation?.currency || 'USD',
          payFrequency: employeeData.compensation?.payFrequency || 'monthly',
          bankDetails: {
            accountName: employeeData.compensation?.bankDetails?.accountName || '',
            accountNumber: employeeData.compensation?.bankDetails?.accountNumber || '',
            bankName: employeeData.compensation?.bankDetails?.bankName || '',
            branch: employeeData.compensation?.bankDetails?.branch || '',
            ifscCode: employeeData.compensation?.bankDetails?.ifscCode || ''
          }
        }
      });
    }
  }, [employeeData, isOpen]);

  const updateEmployeeMutation = useMutation(
    (data) => employeeAPI.update(employeeId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('employees');
        toast.success('Employee updated successfully!');
        onClose();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update employee');
      }
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    updateEmployeeMutation.mutate(formData);
  };

  const updateNestedField = (path, value) => {
    const keys = path.split('.');
    setFormData(prev => {
      const newData = { ...prev };
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        } else {
          current[keys[i]] = { ...current[keys[i]] };
        }
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      title="Edit Employee"
      size="xl"
    >
      {isLoading || !formData ? (
        <div className="flex justify-center py-8">
          <span>Loading...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Account Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  className="form-input"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="hr">HR</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
          </div>
          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                required
                value={formData.personalInfo.firstName}
                onChange={(e) => updateNestedField('personalInfo.firstName', e.target.value)}
              />
              <Input
                label="Last Name"
                required
                value={formData.personalInfo.lastName}
                onChange={(e) => updateNestedField('personalInfo.lastName', e.target.value)}
              />
              <Input
                label="Date of Birth"
                type="date"
                value={formData.personalInfo.dateOfBirth}
                onChange={(e) => updateNestedField('personalInfo.dateOfBirth', e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  className="form-input"
                  value={formData.personalInfo.gender}
                  onChange={(e) => updateNestedField('personalInfo.gender', e.target.value)}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marital Status
                </label>
                <select
                  className="form-input"
                  value={formData.personalInfo.maritalStatus}
                  onChange={(e) => updateNestedField('personalInfo.maritalStatus', e.target.value)}
                >
                  <option value="">Select Status</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                </select>
              </div>
              <Input
                label="Phone"
                type="tel"
                value={formData.personalInfo.phone}
                onChange={(e) => updateNestedField('personalInfo.phone', e.target.value)}
              />
            </div>
          </div>
          {/* Employment Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Employment Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Position"
                required
                value={formData.employmentInfo.position}
                onChange={(e) => updateNestedField('employmentInfo.position', e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  className="form-input"
                  required
                  value={formData.employmentInfo.department}
                  onChange={(e) => updateNestedField('employmentInfo.department', e.target.value)}
                >
                  <option value="">Select Department</option>
                  <option value="Engineering">Engineering</option>
                  <option value="HR">HR</option>
                  <option value="Finance">Finance</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                  <option value="Operations">Operations</option>
                </select>
              </div>
              <Input
                label="Joining Date"
                type="date"
                required
                value={formData.employmentInfo.joiningDate}
                onChange={(e) => updateNestedField('employmentInfo.joiningDate', e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employment Type
                </label>
                <select
                  className="form-input"
                  value={formData.employmentInfo.employmentType}
                  onChange={(e) => updateNestedField('employmentInfo.employmentType', e.target.value)}
                >
                  <option value="full-time">Full Time</option>
                  <option value="part-time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="intern">Intern</option>
                </select>
              </div>
              <Input
                label="Work Location"
                value={formData.employmentInfo.workLocation}
                onChange={(e) => updateNestedField('employmentInfo.workLocation', e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  className="form-input"
                  value={formData.employmentInfo.status}
                  onChange={(e) => updateNestedField('employmentInfo.status', e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on-leave">On Leave</option>
                </select>
              </div>
            </div>
          </div>
          {/* Compensation */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Compensation</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Base Salary"
                type="number"
                required
                value={formData.compensation.baseSalary}
                onChange={(e) => updateNestedField('compensation.baseSalary', e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <select
                  className="form-input"
                  value={formData.compensation.currency}
                  onChange={(e) => updateNestedField('compensation.currency', e.target.value)}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="INR">INR</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pay Frequency
                </label>
                <select
                  className="form-input"
                  value={formData.compensation.payFrequency}
                  onChange={(e) => updateNestedField('compensation.payFrequency', e.target.value)}
                >
                  <option value="monthly">Monthly</option>
                  <option value="bi-weekly">Bi-Weekly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            </div>
          </div>
          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={updateEmployeeMutation.isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={updateEmployeeMutation.isLoading}
            >
              {updateEmployeeMutation.isLoading ? 'Updating...' : 'Update Employee'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default EditEmployeeModal;