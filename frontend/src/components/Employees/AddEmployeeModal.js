import React, { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { employeeAPI } from '../../services/api';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Button from '../UI/Button';
import { toast } from 'react-toastify';

const AddEmployeeModal = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'employee',
    personalInfo: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: '',
      maritalStatus: '',
      nationality: '',
      address: {
        street: '',
        city: '',
        state: '',
        country: '',
        zipCode: ''
      },
      phone: '',
      emergencyContact: {
        name: '',
        relationship: '',
        phone: ''
      }
    },
    employmentInfo: {
      position: '',
      department: '',
      joiningDate: new Date().toISOString().split('T')[0],
      employmentType: 'full-time',
      workLocation: '',
      status: 'active'
    },
    compensation: {
      baseSalary: '',
      currency: 'USD',
      payFrequency: 'monthly',
      bankDetails: {
        accountName: '',
        accountNumber: '',
        bankName: '',
        branch: '',
        ifscCode: ''
      }
    }
  });

  const createEmployeeMutation = useMutation(
    (data) => employeeAPI.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('employees');
        toast.success('Employee added successfully!');
        onClose();
        resetForm();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to add employee');
      }
    }
  );

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      role: 'employee',
      personalInfo: {
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: '',
        maritalStatus: '',
        nationality: '',
        address: {
          street: '',
          city: '',
          state: '',
          country: '',
          zipCode: ''
        },
        phone: '',
        emergencyContact: {
          name: '',
          relationship: '',
          phone: ''
        }
      },
      employmentInfo: {
        position: '',
        department: '',
        joiningDate: new Date().toISOString().split('T')[0],
        employmentType: 'full-time',
        workLocation: '',
        status: 'active'
      },
      compensation: {
        baseSalary: '',
        currency: 'USD',
        payFrequency: 'monthly',
        bankDetails: {
          accountName: '',
          accountNumber: '',
          bankName: '',
          branch: '',
          ifscCode: ''
        }
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createEmployeeMutation.mutate(formData);
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

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      title="Add New Employee"
      size="xl"
    >
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
            <Input
              label="Password"
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
            disabled={createEmployeeMutation.isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={createEmployeeMutation.isLoading}
          >
            {createEmployeeMutation.isLoading ? 'Adding...' : 'Add Employee'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddEmployeeModal;