<template>
	<div class="settings-page" v-if="vault.data">
		<v-card class="settings-card glass-card">
			<div class="brand-mark">
				<div class="shield">
					<span><v-icon icon="$settings" /></span>
				</div>
				<div class="brand-copy">
					<h2>设置</h2>
					<p>管理自动锁定、剪贴板和主密码安全策略</p>
				</div>
			</div>

			<div class="settings-grid">
				<v-text-field
					:model-value="autoLockMinutes"
					density="comfortable"
					hide-details
					label="自动锁定分钟数"
					min="0"
					prepend-inner-icon="$lock"
					type="number"
					variant="outlined"
					@update:model-value="autoLockMinutes = toNumber($event)"
				/>
				<v-text-field
					:model-value="clearClipboardSeconds"
					density="comfortable"
					hide-details
					label="清空剪贴板秒数"
					min="5"
					prepend-inner-icon="$copy"
					type="number"
					variant="outlined"
					@update:model-value="clearClipboardSeconds = toNumber($event)"
				/>
				<v-checkbox
					v-model="lockOnMinimize"
					density="comfortable"
					hide-details
					label="最小化自动锁定"
				/>
				<v-checkbox
					v-model="clearClipboard"
					density="comfortable"
					hide-details
					label="复制密码后清空剪贴板"
				/>
				<v-checkbox
					v-model="hidePasswordByDefault"
					density="comfortable"
					hide-details
					label="默认隐藏密码"
				/>
			</div>
			<div class="row">
				<v-btn
					class="primary-button"
					color="primary"
					prepend-icon="$complete"
					@click="saveSettings"
					>保存设置</v-btn
				>
				<v-btn
					class="ghost-button"
					prepend-icon="$arrowleft"
					variant="outlined"
					@click="router.push('/app')"
					>返回保险箱</v-btn
				>
			</div>

			<h3>修改主密码</h3>
			<div class="settings-grid">
				<v-text-field
					v-model="oldPwd"
					autocomplete="current-password"
					density="comfortable"
					hide-details
					label="旧主密码"
					prepend-inner-icon="$lock"
					type="password"
					variant="outlined"
				/>
				<v-text-field
					v-model="newPwd"
					autocomplete="new-password"
					density="comfortable"
					hide-details
					label="新主密码"
					prepend-inner-icon="mdi-lock"
					type="password"
					variant="outlined"
				/>
				<v-text-field
					v-model="confirmPwd"
					autocomplete="new-password"
					density="comfortable"
					hide-details
					label="确认新主密码"
					prepend-inner-icon="$lock"
					type="password"
					variant="outlined"
				/>
			</div>
			<div class="row">
				<v-btn
					class="primary-button"
					color="primary"
					prepend-icon="$key"
					@click="changePwd"
					>保存新密码</v-btn
				>
			</div>
			<v-alert v-if="error" density="compact" type="error" variant="tonal">{{
				error
			}}</v-alert>
		</v-card>
	</div>
</template>

<script setup lang="ts">
/**
 * 设置页
 *
 * 两块功能：
 * 1. 安全设置（自动锁定、剪贴板清空、密码默认隐藏）——随密码库加密保存；
 * 2. 修改主密码——旧密码校验由主进程完成后用新密码重新加密整库。
 * 打开时把当前设置拷贝到本地表单状态，点"保存设置"才真正写库。
 */
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useVaultStore } from "../stores/vault";
import { useAppStore } from "../stores/app";

const router = useRouter();
const auth = useAuthStore();
const vault = useVaultStore();
const app = useAppStore();
const settings = vault.data?.settings ?? {
	autoLockMinutes: 5,
	lockOnMinimize: true,
	clearClipboard: true,
	clearClipboardSeconds: 30,
	hidePasswordByDefault: true,
};

// 表单本地状态（打开页面时从密码库设置初始化）
const autoLockMinutes = ref(settings.autoLockMinutes);
const lockOnMinimize = ref(settings.lockOnMinimize);
const clearClipboard = ref(settings.clearClipboard);
const clearClipboardSeconds = ref(settings.clearClipboardSeconds);
const hidePasswordByDefault = ref(settings.hidePasswordByDefault);
// 修改主密码的三个输入框
const oldPwd = ref("");
const newPwd = ref("");
const confirmPwd = ref("");
const error = ref("");

/** 数字输入兜底：非法/空值一律转 0 */
const toNumber = (value: unknown) => Number(value || 0);

/** 保存安全设置到密码库 */
const saveSettings = async () => {
	await vault.updateSettings({
		autoLockMinutes: autoLockMinutes.value,
		lockOnMinimize: lockOnMinimize.value,
		clearClipboard: clearClipboard.value,
		clearClipboardSeconds: clearClipboardSeconds.value,
		hidePasswordByDefault: hidePasswordByDefault.value,
	});
	app.showToast("设置已保存");
};

/** 修改主密码：先做完整性/一致性校验，再交主进程重新加密 */
const changePwd = async () => {
	if (!oldPwd.value || !newPwd.value || !confirmPwd.value) {
		error.value = "请填写完整";
		return;
	}
	if (newPwd.value !== confirmPwd.value) {
		error.value = "两次新密码不一致";
		return;
	}

	try {
		await auth.changeMasterPassword(oldPwd.value, newPwd.value);
		app.showToast("主密码已更新");
	} catch (e) {
		error.value = (e as Error).message;
	}
};
</script>
