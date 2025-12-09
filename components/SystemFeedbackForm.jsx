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
    { value: 'bug_report', label: '🐛 Bug Report', description: 'Something isn\'t working' },
    { value: 'feature_request', label: '💡 Feature Request', description: 'Suggest an idea' },
    { value: 'improvement', label: '⚡ Improvement', description: 'Make something better' },
    { value: 'complaint', label: '😔 Complaint', description: 'Report an issue' },
    { value: 'praise', label: '🎉 Praise', description: 'Share positive feedback' },
    { value: 'general', label: '💬 General', description: 'General feedback' },
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
                    <Text style={styles.label}>Type of Feedback *</Text>
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
                                <Text style={[
                                    styles.typeLabel,
                                    formData.feedbackType === type.value && styles.typeLabelSelected,
                                ]}>
                                    {type.label}
                                </Text>
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
                    <Ionicons name="information-circle-outline" size={20} color="#8B5CF6" />
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
        backgroundColor: '#fff',
    },
    scrollView: {
        flex: 1,
    },
    header: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#666',
    },
    section: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#fff',
    },
    picker: {
        height: 50,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    textArea: {
        height: 120,
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
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        backgroundColor: '#f9f9f9',
    },
    typeCardSelected: {
        borderColor: '#8B5CF6',
        backgroundColor: '#F3F0FF',
    },
    typeLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    typeLabelSelected: {
        color: '#8B5CF6',
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
        paddingVertical: 8,
    },
    star: {
        marginHorizontal: 4,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#F3F0FF',
        padding: 12,
        borderRadius: 8,
        marginHorizontal: 20,
        marginTop: 20,
    },
    infoText: {
        flex: 1,
        marginLeft: 8,
        fontSize: 13,
        color: '#8B5CF6',
    },
    bottomSpacing: {
        height: 20,
    },
    footer: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        backgroundColor: '#fff',
    },
    cancelButton: {
        flex: 1,
        marginRight: 8,
        paddingVertical: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    submitButton: {
        flex: 1,
        marginLeft: 8,
        paddingVertical: 14,
        borderRadius: 8,
        backgroundColor: '#8B5CF6',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginLeft: 6,
    },
});
