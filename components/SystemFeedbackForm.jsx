// mobile/components/SystemFeedbackForm.jsx
// System feedback form component for mobile app
// Place this in: mobile/components/SystemFeedbackForm.jsx

import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// Feedback categories with icons
const CATEGORIES = [
    { value: 'dashboard', label: 'Dashboard', icon: 'home-outline' },
    { value: 'alerts', label: 'Alerts & Notifications', icon: 'notifications-outline' },
    { value: 'vehicles', label: 'Vehicle Tracking', icon: 'car-outline' },
    { value: 'service_requests', label: 'Service Requests', icon: 'document-text-outline' },
    { value: 'messaging', label: 'Messaging', icon: 'chatbubbles-outline' },
    { value: 'profile', label: 'Profile & Settings', icon: 'person-outline' },
    { value: 'mobile_app', label: 'Mobile App (General)', icon: 'phone-portrait-outline' },
    { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

const FEEDBACK_TYPES = [
    { value: 'bug_report', label: 'Bug Report', icon: 'bug-outline', description: 'Something isn\'t working' },
    { value: 'feature_request', label: 'Feature Request', icon: 'bulb-outline', description: 'Suggest an idea' },
    { value: 'improvement', label: 'Improvement', icon: 'flash-outline', description: 'Make something better' },
    { value: 'complaint', label: 'Complaint', icon: 'sad-outline', description: 'Report an issue' },
    { value: 'praise', label: 'Praise', icon: 'heart-outline', description: 'Share positive feedback' },
    { value: 'general', label: 'General', icon: 'chatbubble-outline', description: 'General feedback' },
];

const PRIORITIES = [
    { value: 'low', label: 'Low', color: '#10B981' },
    { value: 'medium', label: 'Medium', color: '#F59E0B' },
    { value: 'high', label: 'High', color: '#EF4444' },
    { value: 'critical', label: 'Critical', color: '#DC2626' },
];

export default function SystemFeedbackForm({ onSubmit, onCancel, userRole }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        category: '',
        feedbackType: '',
        priority: 'medium',
        title: '',
        description: '',
        stepsToReproduce: '',
        rating: '',
    });

    const [errors, setErrors] = useState({});

    const validateForm = () => {
        const newErrors = {};

        if (!formData.category) newErrors.category = 'Please select a category';
        if (!formData.feedbackType) newErrors.feedbackType = 'Please select feedback type';
        if (!formData.title.trim()) newErrors.title = 'Title is required';
        else if (formData.title.trim().length < 5) newErrors.title = 'Title must be at least 5 characters';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        else if (formData.description.trim().length < 10) newErrors.description = 'Description must be at least 10 characters';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            Alert.alert('Validation Error', 'Please fill in all required fields correctly');
            return;
        }

        try {
            setLoading(true);

            // Get device info
            const deviceInfo = {
                platform: Platform.OS,
                version: Platform.Version,
                userRole: userRole,
            };

            const feedbackData = {
                category: formData.category,
                feedbackType: formData.feedbackType,
                priority: formData.priority,
                title: formData.title.trim(),
                description: formData.description.trim(),
                stepsToReproduce: formData.stepsToReproduce.trim() || null,
                deviceInfo,
                rating: formData.rating ? parseInt(formData.rating, 10) : null,
            };

            await onSubmit(feedbackData);
            // Don't show alert here - let parent component handle success state
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to submit feedback. Please try again.');
            throw error; // Re-throw so parent can handle if needed
        } finally {
            setLoading(false);
        }
    };

    const updateField = (field, value) => {
        setFormData({ ...formData, [field]: value });
        if (errors[field]) {
            setErrors({ ...errors, [field]: null });
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Send Feedback</Text>
                    <Text style={styles.headerSubtitle}>
                        Help us improve the app by sharing your thoughts
                    </Text>
                </View>

                {/* Category Selection */}
                <View style={styles.section}>
                    <Text style={styles.label}>What is this about? *</Text>
                    <View style={[styles.pickerContainer, errors.category && styles.inputError]}>
                        <Picker
                            selectedValue={formData.category}
                            onValueChange={(value) => updateField('category', value)}
                            style={styles.picker}
                        >
                            <Picker.Item label="Select a category..." value="" />
                            {CATEGORIES.map((cat) => (
                                <Picker.Item key={cat.value} label={cat.label} value={cat.value} />
                            ))}
                        </Picker>
                    </View>
                    {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
                </View>

                {/* Feedback Type Selection */}
                <View style={styles.section}>
                    <View style={styles.typeGrid}>
                        {FEEDBACK_TYPES.map((type) => (
                            <TouchableOpacity
                                key={type.value}
                                style={[
                                    styles.typeCard,
                                    formData.feedbackType === type.value && styles.typeCardSelected,
                                ]}
                                onPress={() => updateField('feedbackType', type.value)}
                            >
                                <View style={styles.typeCardHeader}>
                                    <Ionicons 
                                        name={type.icon} 
                                        size={20} 
                                        color={formData.feedbackType === type.value ? '#10b981' : '#64748b'} 
                                    />
                                    <Text style={[
                                        styles.typeLabel,
                                        formData.feedbackType === type.value && styles.typeLabelSelected,
                                    ]}>
                                        {type.label}
                                    </Text>
                                </View>
                                <Text style={styles.typeDescription}>{type.description}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    {errors.feedbackType && <Text style={styles.errorText}>{errors.feedbackType}</Text>}
                </View>

                {/* Priority */}
                <View style={styles.section}>
                    <Text style={styles.label}>Priority</Text>
                    <View style={styles.priorityRow}>
                        {PRIORITIES.map((priority) => (
                            <TouchableOpacity
                                key={priority.value}
                                style={[
                                    styles.priorityButton,
                                    formData.priority === priority.value && {
                                        backgroundColor: priority.color,
                                        borderColor: priority.color,
                                    },
                                ]}
                                onPress={() => updateField('priority', priority.value)}
                            >
                                <Text
                                    style={[
                                        styles.priorityText,
                                        formData.priority === priority.value && styles.priorityTextSelected,
                                    ]}
                                >
                                    {priority.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Title */}
                <View style={styles.section}>
                    <Text style={styles.label}>Title *</Text>
                    <TextInput
                        style={[styles.input, errors.title && styles.inputError]}
                        value={formData.title}
                        onChangeText={(text) => updateField('title', text)}
                        placeholder="Brief title for your feedback"
                        maxLength={100}
                    />
                    {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
                </View>

                {/* Description */}
                <View style={styles.section}>
                    <Text style={styles.label}>Description *</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, errors.description && styles.inputError]}
                        value={formData.description}
                        onChangeText={(text) => updateField('description', text)}
                        placeholder="Describe your feedback in detail..."
                        multiline
                        numberOfLines={6}
                        textAlignVertical="top"
                    />
                    {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
                </View>

                {/* Steps to Reproduce (for bugs) */}
                {formData.feedbackType === 'bug_report' && (
                    <View style={styles.section}>
                        <Text style={styles.label}>Steps to Reproduce (Optional)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={formData.stepsToReproduce}
                            onChangeText={(text) => updateField('stepsToReproduce', text)}
                            placeholder="1. Go to...&#10;2. Click on...&#10;3. See error"
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>
                )}

                {/* Overall Rating */}
                <View style={styles.section}>
                    <Text style={styles.label}>Overall Rating (Optional)</Text>
                    <View style={styles.ratingContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity
                                key={star}
                                onPress={() => updateField('rating', star.toString())}
                            >
                                <Ionicons
                                    name={formData.rating >= star ? 'star' : 'star-outline'}
                                    size={36}
                                    color="#FFB800"
                                    style={styles.star}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={20} color="#10b981" />
                    <Text style={styles.infoText}>
                        Your feedback helps us improve the app for everyone. Thank you for taking the time!
                    </Text>
                </View>

                <View style={styles.bottomSpacing} />
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={onCancel}
                    disabled={loading}
                >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="send" size={18} color="#fff" />
                            <Text style={styles.submitButtonText}>Submit Feedback</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    scrollView: {
        flex: 1,
    },
    header: {
        padding: 24,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '900',
        color: '#1e293b',
        marginBottom: 6,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#64748b',
        lineHeight: 20,
    },
    section: {
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#475569',
        marginBottom: 10,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        backgroundColor: '#fff',
        overflow: 'hidden',
    },
    picker: {
        height: 50,
    },
    input: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        backgroundColor: '#fff',
        color: '#1e293b',
    },
    textArea: {
        height: 140,
        textAlignVertical: 'top',
    },
    inputError: {
        borderColor: '#EF4444',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        marginTop: 4,
    },
    typeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -4,
    },
    typeCard: {
        width: '48%',
        margin: '1%',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    typeCardSelected: {
        borderColor: '#10b981',
        backgroundColor: '#ecfdf5',
    },
    typeCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    typeLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1e293b',
        flex: 1,
    },
    typeLabelSelected: {
        color: '#059669',
    },
    typeDescription: {
        fontSize: 11,
        color: '#666',
    },
    priorityRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    priorityButton: {
        flex: 1,
        marginHorizontal: 4,
        paddingVertical: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
    },
    priorityText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
    },
    priorityTextSelected: {
        color: '#fff',
    },
    ratingContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingVertical: 12,
    },
    star: {
        marginHorizontal: 8,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#ecfdf5',
        padding: 16,
        borderRadius: 12,
        marginHorizontal: 20,
        marginTop: 24,
        borderWidth: 1,
        borderColor: '#d1fae5',
    },
    infoText: {
        flex: 1,
        marginLeft: 12,
        fontSize: 13,
        color: '#059669',
        lineHeight: 18,
    },
    bottomSpacing: {
        height: 20,
    },
    footer: {
        flexDirection: 'row',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        backgroundColor: '#ffffff',
    },
    cancelButton: {
        flex: 1,
        marginRight: 10,
        paddingVertical: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#64748b',
    },
    submitButton: {
        flex: 1,
        marginLeft: 10,
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: '#10b981',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonDisabled: {
        backgroundColor: '#94a3b8',
        shadowOpacity: 0,
        elevation: 0,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#fff',
        marginLeft: 8,
    },
});
